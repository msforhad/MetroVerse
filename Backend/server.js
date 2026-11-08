import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import multer from "multer";
import { Pool } from "pg";
import axios from "axios";
dotenv.config();

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
  const api = `https://api.github.com/repos/${GITHUB_REPO}/contents/${encodeURIComponent(fullPath)}`;

  let sha = null;
  try {
    const head = await axios.get(api, {
      headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: "application/vnd.github+json" },
      params: { ref: GITHUB_BRANCH },
    });
    sha = head.data?.sha || null;
  } catch {
  }

  const payload = {
    message,
    content: toBase64(contentBuffer),
    branch: GITHUB_BRANCH,
    ...(sha ? { sha } : {}),
  };

  const res = await axios.put(api, payload, {
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: "application/vnd.github+json" },
  });

  return {
    download_url: res.data?.content?.download_url,
    path: res.data?.content?.path,
    sha: res.data?.content?.sha,
  };
}

// ---------- Health ----------
app.get("/health", (req, res) => res.send("ok"));

app.get("/", (req, res) => {
  res.send("StudentResourceHub Backend is Running!");
});

// ---------- Auth Routes ----------
app.post("/auth/signup", async (req, res) => {
  try {
    const { name, email, password, dept_id } = req.body;
    if (!name || !email || !password || !dept_id) return res.status(400).json({ message: "Missing fields" });

    const exists = await q("SELECT 1 FROM users WHERE email=$1", [email]);
    if (exists.rowCount) return res.status(409).json({ message: "Email already exists" });

    const hash = await bcrypt.hash(password, 10);
    const ins = await q(
      `INSERT INTO users (name, email, password, dept_id) 
       VALUES ($1,$2,$3,$4) RETURNING user_id, name, email, dept_id, created_at`,
      [name, email, hash, dept_id]
    );

    const token = signToken({ user_id: ins.rows[0].user_id, email, dept_id });
    res.json({ user: ins.rows[0], token });
  } catch (e) {
    console.error("SIGNUP ERROR:", e);
    res.status(500).json({ 
      message: "Signup error",
      error:e.message

     });
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
      `SELECT user_id, name, email, dept_id, created_at 
       FROM users WHERE user_id=$1`,
      [req.user.user_id]
    );
    res.json(r.rows[0]);
  } catch (err) {
    console.error("Profile fetch error:", err);
    res.status(500).json({ message: "Failed to load profile" });
  }
});
app.put("/auth/me", auth, async (req, res) => {
  try {
    const { name, dept_id, password } = req.body;
    if (!name || !dept_id)
      return res.status(400).json({ message: "name and dept_id are required" });
    await q(`UPDATE users SET name=$1, dept_id=$2 WHERE user_id=$3`, [
      name,
      dept_id,
      req.user.user_id,
    ]);

    if (password && password.length >= 6) {
      const hashed = await bcrypt.hash(password, 10);
      await q(`UPDATE users SET password=$1 WHERE user_id=$2`, [
        hashed,
        req.user.user_id,
      ]);
    }
    res.json({ message: "Profile updated successfully" });
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ message: "Failed to update profile" });
  }
});

app.get("/search-subjects", async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || query.trim().length < 2) {
      return res.json([]);
    }
    const keyword = `%${query.trim().toLowerCase()}%`;
    const r = await q(
      `SELECT 
        s.subject_id,
        s.subject_name,
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
      WHERE LOWER(s.subject_name) LIKE $1
      ORDER BY s.subject_name ASC
      LIMIT 15`,
      [keyword]
    );
    res.json(r.rows);
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ message: "Search failed" });
  }
});

// ---------- Catalog Routes (Dept → Year → Sem → Subjects → Files) ----------
app.get("/departments", async (_req, res) => {
  try {
    const r = await q("SELECT dept_id, dept_name FROM departments ORDER BY dept_name ASC");
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
