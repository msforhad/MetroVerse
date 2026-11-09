import { useEffect, useRef, useState } from "react";
import API from "../lib/api";
import "../styles/profile.css";
import toast from "react-hot-toast";
import CircularProgress from "@mui/material/CircularProgress";

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [edit, setEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState(Date.now());

  const avatarInputRef = useRef(null);

  const [form, setForm] = useState({
    name: "",
    dept_id: "",
    password: "",
  });

  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    loadProfile();
    loadDepartments();
  }, []);

  const loadProfile = async () => {
    try {
      const { data } = await API.get("/auth/me");

      setProfile(data);
      setAvatarVersion(Date.now());

      setForm({
        name: data.name || "",
        dept_id: data.dept_id || "",
        password: "",
      });
    } catch (e) {
      console.log(e);
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

  // ---------- Upload / Change Avatar ----------
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      toast.error("Only JPG, PNG and WEBP images are allowed");
      e.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size must be 2MB or less");
      e.target.value = "";
      return;
    }

    try {
      setUploadingAvatar(true);

      const formData = new FormData();
      formData.append("avatar", file);

      const { data } = await API.post("/auth/me/avatar", formData);

      // Update profile with new image URL
      setProfile((prev) => ({
        ...prev,
        avatar_url: data.avatar_url,
      }));

      // Force browser to load a fresh image
      setAvatarVersion(Date.now());

      toast.success("Profile photo updated successfully!");
    } catch (err) {
      console.error("Avatar Upload Error:", err);

      toast.error(
        err.response?.data?.message || "Failed to upload profile photo",
      );
    } finally {
      setUploadingAvatar(false);

      if (avatarInputRef.current) {
        avatarInputRef.current.value = "";
      }
    }
  };

  // ---------- Remove Avatar ----------
  const handleRemoveAvatar = async () => {
    if (!profile.avatar_url) return;

    const confirmed = window.confirm(
      "Are you sure you want to remove your profile photo?",
    );

    if (!confirmed) return;

    try {
      setUploadingAvatar(true);

      await API.delete("/auth/me/avatar");

      setProfile((prev) => ({
        ...prev,
        avatar_url: null,
      }));

      setAvatarVersion(Date.now());

      toast.success("Profile photo removed successfully!");
    } catch (err) {
      console.error("Avatar Remove Error:", err);

      toast.error(
        err.response?.data?.message || "Failed to remove profile photo",
      );
    } finally {
      setUploadingAvatar(false);
    }
  };

  // ---------- Update Profile ----------
  const onSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);

      const body = {
        name: form.name,
        dept_id: form.dept_id,
        ...(form.password ? { password: form.password } : {}),
      };

      await API.put("/auth/me", body);

      toast.success("Profile updated successfully!");
      setEdit(false);

      await loadProfile();
    } catch (e) {
      toast.error(e.response?.data?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setForm({
      name: profile.name || "",
      dept_id: profile.dept_id || "",
      password: "",
    });

    setEdit(false);
  };

  if (!profile) {
    return (
      <div className="profile-loading">
        <CircularProgress />
      </div>
    );
  }

  const department = departments.find(
    (d) => Number(d.dept_id) === Number(profile.dept_id),
  );

  const initials = (profile.name || "M")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  const joinedDate = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "Member";

  // Unique URL every time a new photo is uploaded
  const avatarSrc = profile.avatar_url
    ? `${profile.avatar_url}${profile.avatar_url.includes("?") ? "&" : "?"}v=${avatarVersion}`
    : null;

  return (
    <div className="student-profile-page">
      <div className="student-profile-wrapper">
        {/* Page Heading */}
        <div className="profile-page-heading">
          <div>
            <span className="profile-eyebrow">ACCOUNT SETTINGS</span>
            <h1>My Profile</h1>
            <p>Manage your personal information and account details.</p>
          </div>
        </div>

        {/* Main Profile Card */}
        <div className="student-profile-card">
          {/* Cover */}
          <div className="profile-cover">
            <div className="cover-pattern"></div>
            <span className="cover-label">METROVERSE STUDENT</span>
          </div>

          {/* User Header */}
          <div className="profile-user-header">
            {/* Avatar */}
            <div className="profile-avatar-area">
              <div className="profile-avatar">
                {avatarSrc ? (
                  <img
                    key={avatarVersion}
                    src={avatarSrc}
                    alt="Profile"
                    className="profile-avatar-image"
                  />
                ) : (
                  initials
                )}
              </div>

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                ref={avatarInputRef}
                onChange={handleAvatarChange}
                hidden
              />

              <div className="avatar-action-buttons">
                <button
                  type="button"
                  className="avatar-change-button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                >
                  {uploadingAvatar
                    ? "Uploading..."
                    : profile.avatar_url
                      ? "Change Photo"
                      : "Upload Photo"}
                </button>

                {profile.avatar_url && (
                  <button
                    type="button"
                    className="avatar-remove-button"
                    onClick={handleRemoveAvatar}
                    disabled={uploadingAvatar}
                  >
                    Remove
                  </button>
                )}
              </div>

              <small className="avatar-help-text">
                JPG, PNG or WEBP · Max 2MB
              </small>
            </div>

            <div className="profile-user-info">
              <h2>{profile.name}</h2>
              <p>{profile.email}</p>

              <div className="profile-member-badge">
                <span></span>
                Student Member
              </div>
            </div>

            {!edit && (
              <button
                className="profile-edit-button"
                onClick={() => setEdit(true)}
              >
                <span>✎</span> Edit Profile
              </button>
            )}
          </div>

          <div className="profile-divider"></div>

          {/* Profile Content */}
          {!edit ? (
            <div className="profile-content">
              <div className="profile-section-title">
                <div>
                  <h3>Personal Information</h3>
                  <p>Your registered account information</p>
                </div>
              </div>

              <div className="profile-info-grid">
                <div className="profile-info-item">
                  <div className="profile-info-icon">👤</div>
                  <div>
                    <span>Full Name</span>
                    <strong>{profile.name || "Not available"}</strong>
                  </div>
                </div>

                <div className="profile-info-item">
                  <div className="profile-info-icon">✉</div>
                  <div>
                    <span>Email Address</span>
                    <strong>{profile.email || "Not available"}</strong>
                  </div>
                </div>

                <div className="profile-info-item">
                  <div className="profile-info-icon">🎓</div>
                  <div>
                    <span>Department</span>
                    <strong>{department?.dept_name || "Not assigned"}</strong>
                  </div>
                </div>

                <div className="profile-info-item">
                  <div className="profile-info-icon">📅</div>
                  <div>
                    <span>Member Since</span>
                    <strong>{joinedDate}</strong>
                  </div>
                </div>
              </div>

              <div className="profile-security-note">
                <div className="security-icon">🔒</div>
                <div>
                  <strong>Your account is protected</strong>
                  <p>
                    Keep your account information up to date. Never share your
                    password with anyone.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="profile-content">
              <div className="profile-section-title">
                <div>
                  <h3>Edit Personal Information</h3>
                  <p>Update your profile details below</p>
                </div>
              </div>

              <form className="modern-profile-form" onSubmit={onSubmit}>
                <div className="modern-form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div className="modern-form-group">
                  <label>Email Address</label>
                  <input type="email" value={profile.email} disabled />
                  <small>Email address cannot be changed here.</small>
                </div>

                <div className="modern-form-group">
                  <label>Department</label>
                  <select
                    value={form.dept_id}
                    onChange={(e) =>
                      setForm({ ...form, dept_id: e.target.value })
                    }
                    required
                  >
                    <option value="">Select Department</option>
                    {departments.map((d) => (
                      <option key={d.dept_id} value={d.dept_id}>
                        {d.dept_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="modern-form-group">
                  <label>New Password</label>
                  <input
                    type="password"
                    value={form.password}
                    placeholder="Leave blank to keep current password"
                    minLength={6}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                  />
                  <small>
                    Enter a new password only if you want to change it.
                  </small>
                </div>

                <div className="profile-form-actions">
                  <button
                    type="submit"
                    className="profile-save-button"
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>

                  <button
                    type="button"
                    className="profile-cancel-button"
                    onClick={cancelEdit}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Bottom Branding */}
        <div className="profile-brand-footer">
          <span>METROVERSE</span>
          <p>Your academic journey, all in one place.</p>
        </div>
      </div>
    </div>
  );
}
