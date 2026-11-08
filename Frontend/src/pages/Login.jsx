import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../lib/api";
import "../styles/home.css";
import toast from "react-hot-toast";
export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [err, setErr] = useState("");
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      const { data } = await API.post("/auth/login", form);
      if (data?.token && data?.user) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        toast.success("Login success");
        navigate("/");
      } else {
        toast.error("invalid server response");
        setErr("Invalid server response");
      }
    } catch (e) {
      toast.error("login failed")
      setErr(e.response?.data?.message || "Login failed");
    }
  };
return (
  <div className="auth-container">
    <div className="auth-card">
      <h2>Login</h2>

      <form onSubmit={submit}>
        <div className="input-group">
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e)=>setForm({...form, email:e.target.value})}
          />
        </div>

        <div className="input-group">
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e)=>setForm({...form, password:e.target.value})}
          />
        </div>

        <button className="auth-btn" type="submit">Login</button>
      </form>

      <p className="auth-link">
        Don't have an account? <Link to="/signup">Sign up</Link>
      </p>
         <div className="demo-box">
      <h4>Demo Login (For Recruiters )</h4>
      <p>Email: demo.login@gmail.com</p>
      <p>Password: demo@1234</p>
         </div>
      {err && <p className="auth-error">{err}</p>}
    </div>
  </div>
);
}

