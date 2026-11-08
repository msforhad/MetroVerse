import { useState } from "react";
import { useNavigate,Link } from "react-router-dom";
import API from "../lib/api";
import toast from "react-hot-toast";
import "../styles/home.css";
export default function Signup() {
  const [form, setForm] = useState({ name:"", email:"", password:"", dept_id:"" });
  const [err, setErr] = useState("");
  const navigate = useNavigate();
  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      const { data } = await API.post("/auth/signup", form);
      if (data?.token && data?.user) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        toast.success("Sign up successfull")
        navigate("/");
      } else {
        setErr("Invalid server response");
      }
    } catch (e) {
      setErr(e.response?.data?.message || "Signup failed");
    }
  };
return (
  <div className="auth-container">
    <div className="auth-card">
      <h2>Create Account</h2>

      <form onSubmit={submit}>

        <div className="input-group">
          <input
            type="text"
            placeholder="Full name"
            value={form.name}
            onChange={(e)=>setForm({...form, name:e.target.value})}
          />
        </div>

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
<div className="input-group">
  <input
    type="number"
    min="1"
    placeholder="Department ID"
    value={form.dept_id}
    onChange={(e) => {
      const val = Number(e.target.value);
      if (val < 1) return;
      setForm({ ...form, dept_id: val });
    }}
  />
</div>
        <button className="auth-btn" type="submit">Sign Up</button>
      </form>
      <p className="auth-link">
        Already have an account? <Link to="/login">Login</Link>
      </p>
      {err && <p className="auth-error">{err}</p>}
    </div>
  </div>
);
}

