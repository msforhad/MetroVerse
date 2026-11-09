import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import multer from "multer";
import { Pool } from "pg";
import axios from "axios";
import nodemailer from "nodemailer";
import crypto from "crypto";
dotenv.config();

// ---------- Avatar Upload (JPG, PNG, WEBP; max 2MB) ----------
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG and WEBP images are allowed"));
    }
  },
});

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error("SMTP Connection Failed:", error);
  } else {
    console.log("Brevo SMTP Connected Successfully!");
  }
});

const app = express();
app.use(cors());
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true }));

// ---------- ENV ----------
const {
  PORT = 3000,
  JWT_SECRET = "dev_secret",
  PGUSER,
  PGPASSWORD,
  PGHOST = "localhost",
  PGPORT = 5432,
  PGDATABASE,
  GITHUB_TOKEN,
  GITHUB_REPO,
  GITHUB_BRANCH = "main",
  GITHUB_BASE_PATH = "uploads",
  MAX_UPLOAD_MB = 100,
} = process.env;

// ---------- DB ----------
const pool = new Pool({
  user: PGUSER,
  password: PGPASSWORD,
  host: PGHOST,
  port: PGPORT,
  database: PGDATABASE,
});

pool.query("SELECT NOW()")
  .then(() => {
    console.log("PostgreSQL Database Connected Successfully!");
  })
  .catch((err) => {
    console.error("Database Connection Failed:", err.message);
  });

// ---------- Auth ----------
const signToken = (payload) => jwt.sign(payload, JWT_SECRET, { expiresIn: "2d" });

const auth = (req, res, next) => {
  try {
    const hdr = req.headers.authorization || "";
    const token = hdr.startsWith("Bearer ") ? hdr.split(" ")[1] : null;
    if (!token) return res.status(401).json({ message: "No token" });
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

// ---------- Multer (single file, memory) ----------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: Number(MAX_UPLOAD_MB) * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
      "application/vnd.openxmlformats-officedocument.presentationml.presentation", // pptx
      "application/zip",
      "application/x-zip-compressed",
    ];
    if (ok.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Unsupported file type"));
  },
});

// ---------- Helpers ----------
const q = (text, params=[]) => pool.query(text, params);
const sanitizeName = (s="") => s.replace(/[\\/#?%*:|"<>]/g, "-").trim();
const toBase64 = (buf) => Buffer.from(buf).toString("base64");

async function buildGitHubPath({ dept_id, year_id, sem_id, subject_id, originalName }) {
  const [[dept], [year], [sem], [sub]] = await Promise.all([
    q("SELECT dept_name FROM departments WHERE dept_id=$1", [dept_id]).then(r => r.rows),
    q("SELECT year_name FROM years WHERE year_id=$1", [year_id]).then(r => r.rows),
    q("SELECT sem_name FROM semesters WHERE sem_id=$1", [sem_id]).then(r => r.rows),
    q("SELECT subject_name FROM subjects WHERE subject_id=$1", [subject_id]).then(r => r.rows),
  ]);

  if (!dept || !year || !sem || !sub) throw new Error("Invalid taxonomy ids");

  const parts = [
    GITHUB_BASE_PATH,
    sanitizeName(dept.dept_name),
    sanitizeName(year.year_name),
    sanitizeName(sem.sem_name),
    sanitizeName(sub.subject_name),
    sanitizeName(originalName),
  ];
  return parts.join("/");
}


async function githubUpsertFile({ fullPath, contentBuffer, message }) {
  // Encode each folder/file name separately.
  // Keep "/" between folders.
  const encodedPath = fullPath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");

  const api = `https://api.github.com/repos/${GITHUB_REPO}/contents/${encodedPath}`;

  const headers = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  let sha = null;

  // Check whether the file already exists
  try {
    const existing = await axios.get(api, {
      headers,
      params: { ref: GITHUB_BRANCH },
    });

    sha = existing.data?.sha || null;
  } catch (err) {
    // Only 404 means the file does not exist yet.
    if (err.response?.status !== 404) {
      throw err;
    }
  }

  const payload = {
    message,
    content: toBase64(contentBuffer),
    branch: GITHUB_BRANCH,
    ...(sha ? { sha } : {}),
  };

  const response = await axios.put(api, payload, { headers });

  return {
    download_url: response.data?.content?.download_url,
    path: response.data?.content?.path,
    sha: response.data?.content?.sha,
  };
}


// ---------- Health ----------
app.get("/health", (req, res) => res.send("ok"));

app.get("/", (req, res) => {
  res.send("StudentResourceHub Backend is Running!");
});

// ---------- Auth Routes ----------
app.post("/auth/signup/send-otp", async (req, res) => {
  try {
    const { name, email, password, dept_id } = req.body;

    if (!name || !email || !password || !dept_id) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await q(
      "SELECT 1 FROM users WHERE LOWER(email)=$1",
      [normalizedEmail]
    );

    if (existingUser.rowCount) {
      return res.status(409).json({ message: "Email already exists" });
    }

    const department = await q(
      "SELECT dept_id FROM departments WHERE dept_id=$1",
      [dept_id]
    );

    if (!department.rowCount) {
      return res.status(400).json({ message: "Invalid department" });
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const passwordHash = await bcrypt.hash(password, 10);

    await q(
      `INSERT INTO signup_otps
       (name, email, password_hash, dept_id, otp_hash, expires_at)
       VALUES ($1,$2,$3,$4,$5,NOW() + INTERVAL '5 minutes')
       ON CONFLICT (email)
       DO UPDATE SET
         name=EXCLUDED.name,
         password_hash=EXCLUDED.password_hash,
         dept_id=EXCLUDED.dept_id,
         otp_hash=EXCLUDED.otp_hash,
         expires_at=EXCLUDED.expires_at,
         created_at=CURRENT_TIMESTAMP`,
      [name.trim(), normalizedEmail, passwordHash, dept_id, otpHash]
    );

    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: normalizedEmail,
        subject: "MetroVerse Email Verification OTP",
        html: `
          <div style="font-family:Arial,sans-serif;padding:20px">
            <h2>Welcome to MetroVerse!</h2>
            <p>Your email verification OTP is:</p>
            <h1 style="letter-spacing:8px;color:#2563eb">${otp}</h1>
            <p>This OTP will expire in 5 minutes.</p>
            <p>If you did not request this, please ignore this email.</p>
          </div>
        `,
      });
    } catch (mailError) {
      await q("DELETE FROM signup_otps WHERE email=$1", [
        normalizedEmail,
      ]);
      throw mailError;
    }

    res.json({ message: "OTP sent successfully" });

  } catch (err) {
    console.error("Send OTP Error:", err.message);
    res.status(500).json({ message: "Failed to send OTP. Check email configuration." });
  }
});

app.post("/auth/signup/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const result = await q(
      "SELECT * FROM signup_otps WHERE email=$1",
      [normalizedEmail]
    );

    const pending = result.rows[0];

    if (!pending) {
      return res.status(404).json({
        message: "OTP not found. Please request a new OTP.",
      });
    }

    if (new Date(pending.expires_at).getTime() <= Date.now()) {
      await q("DELETE FROM signup_otps WHERE email=$1", [
        normalizedEmail,
      ]);

      return res.status(400).json({
        message: "OTP expired. Please request a new OTP.",
      });
    }

    const validOTP = await bcrypt.compare(
      String(otp).trim(),
      pending.otp_hash
    );

    if (!validOTP) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    const existingUser = await q(
      "SELECT 1 FROM users WHERE LOWER(email)=$1",
      [normalizedEmail]
    );

    if (existingUser.rowCount) {
      await q("DELETE FROM signup_otps WHERE email=$1", [
        normalizedEmail,
      ]);

      return res.status(409).json({ message: "Email already exists" });
    }

    const inserted = await q(
      `INSERT INTO users (name, email, password, dept_id)
       VALUES ($1,$2,$3,$4)
       RETURNING user_id, name, email, dept_id, created_at`,
      [
        pending.name,
        pending.email,
        pending.password_hash,
        pending.dept_id,
      ]
    );

    await q("DELETE FROM signup_otps WHERE email=$1", [
      normalizedEmail,
    ]);

    const user = inserted.rows[0];

    const token = signToken({
      user_id: user.user_id,
      email: user.email,
      dept_id: user.dept_id,
    });

    res.json({
      message: "Account created successfully",
      user,
      token,
    });

  } catch (err) {
    console.error("Verify OTP Error:", err.message);
    res.status(500).json({ message: "OTP verification failed" });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const r = await q("SELECT * FROM users WHERE email=$1", [email]);
    const user = r.rows[0];
    if (!user) return res.status(404).json({ message: "User not found" });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: "Invalid password" });
    const token = signToken({ user_id: user.user_id, email: user.email, dept_id: user.dept_id });
    const { password: _, ...safe } = user;
    res.json({ user: safe, token });
  } catch {
    res.status(500).json({ message: "Login error" });
  }
});

app.get("/me", auth, async (req, res) => {
  const r = await q(
    "SELECT user_id, name, email, dept_id, created_at FROM users WHERE user_id=$1",
    [req.user.user_id]
  );
  res.json(r.rows[0]);
});

app.get("/auth/me", auth, async (req, res) => {
  try {
    const r = await q(
      `SELECT user_id, name, email, dept_id, created_at, avatar_url
       FROM users
       WHERE user_id=$1`,
      [req.user.user_id]
    );

    if (!r.rows[0]) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(r.rows[0]);
  } catch (err) {
    console.error("Profile fetch error:", err);
    res.status(500).json({ message: "Failed to load profile" });
  }
});


// ---------- Update Profile ----------
app.put("/auth/me", auth, async (req, res) => {
  try {
    const { name, dept_id, password } = req.body;

    if (!name || !name.trim() || !dept_id) {
      return res.status(400).json({
        message: "Name and department are required",
      });
    }

    // Check department
    const department = await q(
      "SELECT dept_id FROM departments WHERE dept_id=$1",
      [dept_id]
    );

    if (!department.rowCount) {
      return res.status(400).json({
        message: "Invalid department",
      });
    }

    // Optional password update
    let result;

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({
          message: "Password must be at least 6 characters",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      result = await q(
        `UPDATE users
         SET name=$1, dept_id=$2, password=$3
         WHERE user_id=$4
         RETURNING user_id, name, email, dept_id, created_at, avatar_url`,
        [name.trim(), dept_id, hashedPassword, req.user.user_id]
      );
    } else {
      result = await q(
        `UPDATE users
         SET name=$1, dept_id=$2
         WHERE user_id=$3
         RETURNING user_id, name, email, dept_id, created_at, avatar_url`,
        [name.trim(), dept_id, req.user.user_id]
      );
    }

    if (!result.rowCount) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json({
      message: "Profile updated successfully!",
      user: result.rows[0],
    });

  } catch (err) {
    console.error("Profile Update Error:", err);
    res.status(500).json({
      message: "Failed to update profile",
    });
  }
});



// ---------- Upload / Change Profile Photo ----------
app.post(
  "/auth/me/avatar",
  auth,
  (req, res, next) => {
    avatarUpload.single("avatar")(req, res, (err) => {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            message: "Image size must be 2MB or less",
          });
        }

        return res.status(415).json({
          message: err.message || "Invalid image",
        });
      }

      next();
    });
  },
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "Please select a profile photo",
        });
      }

      const extensionByType = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
      };

      const extension = extensionByType[req.file.mimetype];

      const fullPath =
  `uploads/avatars/user-${req.user.user_id}-${Date.now()}.${extension}`;

      const gh = await githubUpsertFile({
        fullPath,
        contentBuffer: req.file.buffer,
        message: `update profile avatar for user ${req.user.user_id}`,
      });

      if (!gh.download_url) {
        return res.status(502).json({
          message: "Failed to upload photo to GitHub",
        });
      }

      await q(
        `UPDATE users
         SET avatar_url=$1
         WHERE user_id=$2`,
        [gh.download_url, req.user.user_id]
      );

      res.json({
        message: "Profile photo updated successfully",
        avatar_url: gh.download_url,
      });
    } catch (err) {
      console.error("Avatar Upload Error:", err.response?.data || err.message);

      res.status(500).json({
        message: "Failed to upload profile photo",
      });
    }
  }
);

// ---------- Remove Profile Photo ----------
app.delete("/auth/me/avatar", auth, async (req, res) => {
  try {
    await q(
      `UPDATE users
       SET avatar_url=NULL
       WHERE user_id=$1`,
      [req.user.user_id]
    );

    res.json({
      message: "Profile photo removed successfully",
    });
  } catch (err) {
    console.error("Avatar Remove Error:", err);
    res.status(500).json({
      message: "Failed to remove profile photo",
    });
  }
});

/* =========================
   SEARCH BAR
========================= */

app.get("/search-subjects", async (req, res) => {
  try {
    const query = String(req.query.query || "").trim();

    if (query.length < 2) {
      return res.json([]);
    }

    const keyword = `%${query.toLowerCase()}%`;

    const r = await q(
      `SELECT
        s.subject_id,
        s.subject_name,
        s.course_code,
        d.dept_id,
        d.dept_name,
        y.year_id,
        y.year_name,
        sem.sem_id,
        sem.sem_name
      FROM subjects s
      JOIN departments d ON s.dept_id = d.dept_id
      JOIN semesters sem ON s.sem_id = sem.sem_id
      JOIN years y ON sem.year_id = y.year_id
      WHERE
        LOWER(s.subject_name) LIKE $1
        OR LOWER(COALESCE(s.course_code, '')) LIKE $1
        OR LOWER(d.dept_name) LIKE $1
      ORDER BY s.subject_name ASC
      LIMIT 15`,
      [keyword]
    );

    res.json(r.rows);
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({
      message: "Search failed"
    });
  }
});



// ---------- Catalog Routes (Dept → Year → Sem → Subjects → Files) ----------
app.get("/departments", async (_req, res) => {
  try {
    const r = await q(
      "SELECT dept_id, dept_name, short_name FROM departments ORDER BY dept_name ASC"
    );
    res.json(r.rows);
  } catch {
    res.status(500).json({ message: "Failed to load departments" });
  }
});

app.get("/years", async (req, res) => {
  try {
    const r = await q("SELECT year_id, year_name FROM years ORDER BY year_id ASC");
    res.json(r.rows);
  } catch {
    res.status(500).json({ message: "Failed to load years" });
  }
});

app.get("/semesters", async (req, res) => {
  try {
    const { year_id } = req.query;
    if (!year_id) return res.status(400).json({ message: "year_id is required" });
    const r = await q(
      "SELECT sem_id, year_id, sem_name FROM semesters WHERE year_id=$1 ORDER BY sem_id ASC",
      [year_id]
    );
    res.json(r.rows);
  } catch {
    res.status(500).json({ message: "Failed to load semesters" });
  }
});

app.get("/subjects", async (req, res) => {
  try {
    const { sem_id, dept_id } = req.query;
    if (!sem_id || !dept_id) return res.status(400).json({ message: "sem_id and dept_id are required" });
    const r = await q(
      "SELECT subject_id, sem_id, dept_id, subject_name FROM subjects WHERE sem_id=$1 AND dept_id=$2 ORDER BY subject_name ASC",
      [sem_id, dept_id]
    );
    res.json(r.rows);
  } catch {
    res.status(500).json({ message: "Failed to load subjects" });
  }
});


// ---------- My Department PDF Subjects ----------
app.get("/my-pdf-subjects", auth, async (req, res) => {
  try {
    // Get the student's current department
    const userResult = await q(
      "SELECT dept_id FROM users WHERE user_id=$1",
      [req.user.user_id]
    );

    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const result = await q(
      `SELECT
          sub.subject_id,
          sub.subject_name,
          sub.course_code,
          d.dept_id,
          d.dept_name,
          y.year_id,
          y.year_name,
          sem.sem_id,
          sem.sem_name,
          COUNT(f.file_id)::int AS pdf_count
       FROM subjects sub
       JOIN departments d ON sub.dept_id = d.dept_id
       JOIN semesters sem ON sub.sem_id = sem.sem_id
       JOIN years y ON sem.year_id = y.year_id
       JOIN files f ON f.subject_id = sub.subject_id
                   AND f.sem_id = sem.sem_id
                   AND f.year_id = y.year_id
       WHERE sub.dept_id = $1
         AND (
           LOWER(f.file_type) = 'application/pdf'
           OR LOWER(f.file_name) LIKE '%.pdf'
         )
       GROUP BY
          sub.subject_id, sub.subject_name, sub.course_code,
          d.dept_id, d.dept_name,
          y.year_id, y.year_name,
          sem.sem_id, sem.sem_name
       ORDER BY y.year_id, sem.sem_id, sub.subject_name`,
      [user.dept_id]
    );

    res.json(result.rows);

  } catch (err) {
    console.error("My PDF Subjects Error:", err);
    res.status(500).json({
      message: "Failed to load PDF subjects"
    });
  }
});


app.get("/files", async (req, res) => {
  try {
    const { year_id, sem_id, subject_id } = req.query;
    if (!year_id || !sem_id) return res.status(400).json({ message: "year_id and sem_id are required" });
    let query = `
      SELECT file_id, user_id, year_id, sem_id, subject_id,
             file_name, file_url, file_type, uploaded_at
      FROM files
      WHERE year_id=$1 AND sem_id=$2
    `;
    const params = [year_id, sem_id];
    if (subject_id) {
      query += " AND subject_id=$3";
      params.push(subject_id);
    }
    query += " ORDER BY uploaded_at DESC";
    const r = await q(query, params);
    res.json(r.rows);
  } catch (err) {
    console.error("Files fetch error:", err);
    res.status(500).json({ message: "Failed to load files" });
  }
});

// ---------- Read PDF Online ----------
app.get("/files/:fileId/view", auth, async (req, res) => {
  try {
    const { fileId } = req.params;

    const result = await q(
      "SELECT file_name, file_url, file_type FROM files WHERE file_id=$1",
      [fileId]
    );

    const file = result.rows[0];

    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    if (
      file.file_type !== "application/pdf" &&
      !file.file_name.toLowerCase().endsWith(".pdf")
    ) {
      return res.status(415).json({ message: "Only PDF files can be viewed online" });
    }

    // Extract GitHub file path from saved download URL
    const rawUrl = new URL(file.file_url);
    const parts = rawUrl.pathname.split("/").filter(Boolean);

    const [owner, repo, branch, ...pathParts] = parts;
    const [expectedOwner, expectedRepo] = GITHUB_REPO.split("/");

    if (
      rawUrl.hostname !== "raw.githubusercontent.com" ||
      owner !== expectedOwner ||
      repo !== expectedRepo ||
      branch !== GITHUB_BRANCH ||
      pathParts.length === 0
    ) {
      return res.status(400).json({ message: "Invalid GitHub file URL" });
    }

  const decodedPathParts = pathParts.map((part) =>
  decodeURIComponent(part)
);

const githubApiUrl =
  `https://api.github.com/repos/${GITHUB_REPO}/contents/` +
  decodedPathParts.map((part) => encodeURIComponent(part)).join("/");

    const githubResponse = await axios.get(githubApiUrl, {
      params: { ref: GITHUB_BRANCH },
      responseType: "arraybuffer",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github.raw",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, no-store");

    res.send(Buffer.from(githubResponse.data));

  } catch (err) {
    console.error("PDF View Error:", err.response?.data || err.message);

    res.status(500).json({
      message: "Failed to open PDF"
    });
  }
});

// Get all resources of a department
app.get("/department/:deptId/resources", auth, async (req, res) => {
  try {
    const { deptId } = req.params;

    const result = await q(
      `SELECT
          f.file_id,
          f.user_id,
          f.file_name,
          f.file_url,
          f.file_type,
          f.uploaded_at,
          sub.subject_name,
          sub.course_code,
          d.dept_name,
          d.short_name,
          y.year_name,
          sem.sem_name
       FROM files f
       JOIN subjects sub ON f.subject_id = sub.subject_id
       JOIN departments d ON sub.dept_id = d.dept_id
       JOIN semesters sem ON f.sem_id = sem.sem_id
       JOIN years y ON f.year_id = y.year_id
       WHERE d.dept_id = $1
       ORDER BY y.year_id, sem.sem_id, sub.subject_name, f.uploaded_at DESC`,
      [deptId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Department Resources Error:", err);
    res.status(500).json({
      message: "Failed to load department resources"
    });
  }
});
// ---------- Upload (single; auth; duplicate check; GitHub write) ----------
app.post("/upload", auth, upload.single("file"), async (req, res) => {
  try {
    const { year_id, sem_id, subject_id, dept_id } = req.body;
    if (!req.file || !year_id || !sem_id || !subject_id || !dept_id) {
      return res.status(400).json({ message: "Missing fields or file" });
    }

    const dup = await q(
      "SELECT 1 FROM files WHERE subject_id=$1 AND file_name=$2",
      [subject_id, req.file.originalname]
    );
    if (dup.rowCount) return res.status(409).json({ message: "File already exists" });

    const fullPath = await buildGitHubPath({
      dept_id,
      year_id,
      sem_id,
      subject_id,
      originalName: req.file.originalname,
    });

    const gh = await githubUpsertFile({
      fullPath,
      contentBuffer: req.file.buffer,
      message: `upload: ${req.file.originalname} by user ${req.user.user_id}`,
    });

    if (!gh.download_url) return res.status(502).json({ message: "Failed to store in GitHub" });

    const ins = await q(
      `INSERT INTO files (user_id, year_id, sem_id, subject_id, file_name, file_url, file_type)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [
        req.user.user_id,
        year_id,
        sem_id,
        subject_id,
        req.file.originalname,
        gh.download_url,
        req.file.mimetype,
      ]
    );

    res.status(201).json({ file: ins.rows[0] });
  } catch (e) {
    console.error("UPLOAD ERROR:", e);
    if (String(e.message || "").includes("Unsupported file type")) {
      return res.status(415).json({ message: "Unsupported file type" });
    }
    res.status(500).json({ message: "Upload failed" });
  }
});

// ---------- Download (auth; logs history; returns direct url) ----------
app.post("/files/:fileId/download", auth, async (req, res) => {
  try {
    const { fileId } = req.params;
    const r = await q("SELECT * FROM files WHERE file_id=$1", [fileId]);
    const file = r.rows[0];
    if (!file) return res.status(404).json({ message: "File not found" });

    await q(
      "INSERT INTO history (user_id, file_id) VALUES ($1, $2)",
      [req.user.user_id, fileId]
    );

    res.json({ url: file.file_url });
  } catch {
    res.status(500).json({ message: "Download init failed" });
  }
});

// ---------- History (auth) ----------
app.get("/history", auth, async (req, res) => {
  try {
    const r = await q(
      `SELECT 
          h.history_id, h.downloaded_at,
          f.file_id, f.file_name, f.file_url, f.file_type,
          d.dept_name, y.year_name, s.sem_name, sub.subject_name
       FROM history h
       JOIN files f ON h.file_id = f.file_id
       JOIN subjects sub ON f.subject_id = sub.subject_id
       JOIN departments d ON sub.dept_id = d.dept_id
       JOIN years y ON f.year_id = y.year_id
       JOIN semesters s ON f.sem_id = s.sem_id
       WHERE h.user_id = $1
       ORDER BY h.downloaded_at DESC`,
      [req.user.user_id]
    );

    res.json(r.rows);
  } catch (e) {
    console.error("History fetch error:", e);
    res.status(500).json({ message: "Failed to fetch history" });
  }
});

app.post("/history/add", auth, async (req, res) => {
  try {
    const { file_id } = req.body;
    if (!file_id) return res.status(400).json({ message: "file_id required" });

    await q(`INSERT INTO history (user_id, file_id) VALUES ($1, $2)`, [
      req.user.user_id,
      file_id,
    ]);

    res.json({ message: "History saved" });
  } catch (e) {
    console.error("History add error", e);
    res.status(500).json({ message: "Failed to save history" });
  }
});
// ---------- Start ----------
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
