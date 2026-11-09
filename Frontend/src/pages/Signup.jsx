import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../lib/api";
import toast from "react-hot-toast";
import "../styles/signup.css";

export default function Signup() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    dept_id: "",
  });

  const [departments, setDepartments] = useState([]);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    API.get("/departments")
      .then(({ data }) => setDepartments(data))
      .catch(() => setErr("Failed to load departments"));
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const sendOTP = async (e) => {
    e.preventDefault();
    setErr("");

    if (
      !form.name.trim() ||
      !form.email.trim() ||
      !form.password ||
      !form.dept_id
    ) {
      setErr("Please complete all fields");
      return;
    }

    if (form.password.length < 6) {
      setErr("Password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);

      const { data } = await API.post("/auth/signup/send-otp", form);

      setOtpSent(true);
      toast.success(data.message || "OTP sent successfully");
    } catch (e) {
      setErr(e.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async (e) => {
    e.preventDefault();
    setErr("");

    if (!/^\d{6}$/.test(otp)) {
      setErr("Please enter a valid 6-digit OTP");
      return;
    }

    try {
      setLoading(true);

      const { data } = await API.post("/auth/signup/verify-otp", {
        email: form.email,
        otp,
      });

      if (data.token && data.user) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        toast.success("Account created successfully!");
        navigate("/");
      } else {
        setErr("Invalid server response");
      }
    } catch (e) {
      setErr(e.response?.data?.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-page">
      <div className="signup-background-shape shape-one"></div>
      <div className="signup-background-shape shape-two"></div>

      <div className="signup-card">
        <div className="signup-brand">
          <div className="signup-logo">M</div>
          <span>
            Metro<span>Verse</span>
          </span>
        </div>

        <div className="signup-heading">
          <div className="signup-icon">{otpSent ? "✉" : "🎓"}</div>

          <h1>{otpSent ? "Verify Your Email" : "Create Account"}</h1>

          <p>
            {otpSent
              ? "Enter the verification code sent to your email"
              : "Join MetroVerse and explore your academic resources"}
          </p>
        </div>

        {!otpSent ? (
          <form onSubmit={sendOTP} className="signup-form">
            <div className="signup-field">
              <label>Full Name</label>
              <input
                type="text"
                name="name"
                placeholder="Enter your full name"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="signup-field">
              <label>Email Address</label>
              <input
                type="email"
                name="email"
                placeholder="example@gmail.com"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="signup-field">
              <label>Password</label>

              <div className="signup-password-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Minimum 6 characters"
                  value={form.password}
                  onChange={handleChange}
                  minLength={6}
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="signup-field">
              <label>Department</label>

              <select
                name="dept_id"
                value={form.dept_id}
                onChange={handleChange}
                required
              >
                <option value="">Select your department</option>

                {departments.map((dept) => (
                  <option key={dept.dept_id} value={dept.dept_id}>
                    {dept.short_name || dept.dept_name} - {dept.dept_name}
                  </option>
                ))}
              </select>
            </div>

            {err && <div className="signup-error">{err}</div>}

            <button type="submit" className="signup-submit" disabled={loading}>
              {loading ? "Sending OTP..." : "Create Account"}
              {!loading && <span>→</span>}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyOTP} className="signup-form">
            <div className="otp-email-box">
              <span>Verification email sent to</span>
              <strong>{form.email}</strong>
            </div>

            <div className="signup-field">
              <label>6-Digit Verification Code</label>

              <input
                className="otp-input"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                required
              />
            </div>

            {err && <div className="signup-error">{err}</div>}

            <button type="submit" className="signup-submit" disabled={loading}>
              {loading ? "Verifying..." : "Verify & Create Account"}
              {!loading && <span>→</span>}
            </button>

            <button
              type="button"
              className="signup-back"
              disabled={loading}
              onClick={() => {
                setOtpSent(false);
                setOtp("");
                setErr("");
              }}
            >
              ← Change Signup Details
            </button>
          </form>
        )}

        {!otpSent && (
          <div className="signup-footer">
            Already have an account?
            <Link to="/login"> Sign In</Link>
          </div>
        )}

        <div className="signup-bottom-text">
          © 2026 MetroVerse. Your academic companion.
        </div>
      </div>
    </div>
  );
}
