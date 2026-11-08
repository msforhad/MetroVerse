import { useEffect, useState } from "react";
import API from "../lib/api";
import "../styles/profile.css";
import toast from "react-hot-toast";
import CircularProgress from "@mui/material/CircularProgress";
export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({ name: "", dept_id: "", password: "" });
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    loadProfile();
    loadDepartments();
  }, []);

  const loadProfile = async () => {
    try {
      const { data } = await API.get("/auth/me");
      setProfile(data);
      setForm({ name: data.name, dept_id: data.dept_id, password: "" });
    } catch(e) {
      console.log(e)
      toast.error("Failed to load profile");
    }
  };

  const loadDepartments = async () => {
    try {
      const { data } = await API.get("/departments");
      setDepartments(data || []);
    } catch {
      setDepartments([]);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      const body = {
        name: form.name,
        dept_id: form.dept_id,
        ...(form.password ? { password: form.password } : {}),
      };

      await API.put("/auth/me", body);
      toast.success("Profile updated!");
      setEdit(false);
      loadProfile();
    } catch (e) {
      toast.error(e.response?.data?.message || "Update failed");
    }
  };
if (!profile)
  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "70vh", 
      width: "100%"
    }}>
      <CircularProgress />
    </div>
  );


  return (
    <div className="container page-padding profile-container">
      <h2>My Profile</h2>

      {!edit ? (
        <div className="profile-card">
          <p><strong>Name:</strong> {profile.name}</p>
          <p><strong>Email:</strong> {profile.email}</p>
          <p><strong>Department:</strong> {departments.find(d => d.dept_id === profile.dept_id)?.dept_name}</p>
          <p><strong>Joined:</strong> {new Date(profile.created_at).toDateString()}</p>

          <button className="btn-primary" onClick={() => setEdit(true)}>
            Edit Profile
          </button>
        </div>
      ) : (
        <form className="profile-form" onSubmit={onSubmit}>
          <label>Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <label>Department</label>
          <select
            value={form.dept_id}
            onChange={(e) => setForm({ ...form, dept_id: e.target.value })}
          >
            {departments.map((d) => (
              <option key={d.dept_id} value={d.dept_id}>{d.dept_name}</option>
            ))}
          </select>

          <label>New Password (optional)</label>
          <input
            type="password"
            value={form.password}
            placeholder="Leave blank to keep same"
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />

          <div className="row gap">
            <button type="submit" className="btn-primary">Save</button>
            <button className="btn-ghost" onClick={() => setEdit(false)}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}
