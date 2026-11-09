
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import API from "../lib/api";
import "../styles/navbar.css";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [query, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [profile, setProfile] = useState(null);
  const [avatarVersion, setAvatarVersion] = useState(Date.now());

  const navigate = useNavigate();
  const location = useLocation();

  const isAuthed = !!localStorage.getItem("token");

  // Load logged-in user's profile
  useEffect(() => {
    const loadNavbarProfile = async () => {
      if (!isAuthed) {
        setProfile(null);
        return;
      }

      try {
        const { data } = await API.get("/auth/me");
        setProfile(data);
        setAvatarVersion(Date.now());
      } catch (err) {
        console.error("Navbar profile loading failed:", err);
        setProfile(null);
      }
    };

    loadNavbarProfile();
  }, [location.pathname, isAuthed]);

  // Search subjects
useEffect(() => {
  const searchSubjects = async () => {
    const searchText = query.trim();

    if (searchText.length < 2) {
      setResults([]);
      return;
    }

    try {
      const { data } = await API.get("/search-subjects", {
        params: { query: searchText },
      });

      setResults(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Search failed:", err.response?.data || err.message);
      setResults([]);
    }
  };

  const timer = setTimeout(searchSubjects, 400);

  return () => clearTimeout(timer);
}, [query]);

  const logout = () => {
    localStorage.clear();
    setProfile(null);
    setOpen(false);
    navigate("/login");
  };

  const goToSubject = (s) => {
    setQ("");
    setResults([]);

    navigate(
      `/dept/${s.dept_id}/year/${s.year_id}/sem/${s.sem_id}/files?subject=${s.subject_id}`
    );
  };

  const initials = (profile?.name || "M")
    .trim()
    .split(/\s+/)
    .slice(0, 1)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  const avatarSrc = profile?.avatar_url
    ? `${profile.avatar_url}${profile.avatar_url.includes("?") ? "&" : "?"}v=${avatarVersion}`
    : null;

  return (
    <header className="nav">
      {/* Brand */}
      <div className="nav-left">
        <Link to="/" className="brand">
          MetroVerse
        </Link>
      </div>

      {/* Search */}
      <div className="row-two">
        <button className="hamburger" onClick={() => setOpen((p) => !p)}>
          <span />
          <span />
          <span />
        </button>

        <div className="search-container">
          <span className="search-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </span>

          <input
            type="text"
            placeholder="Search subjects..."
            value={query}
            onChange={(e) => setQ(e.target.value)}
          />

          {results.length > 0 && (
            <div className="search-results">
              {results.map((s) => (
                <div
                  key={s.subject_id}
                  className="search-item"
                  onClick={() => goToSubject(s)}
                >
                  <strong>{s.subject_name}</strong>
                  <span>
                    {s.dept_name} • {s.year_name} • {s.sem_name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Navigation Links */}
      <div className={`nav-links ${open ? "show" : ""}`}>
        <Link to="/" onClick={() => setOpen(false)}>
          Home
        </Link>

        <Link to="/upload" onClick={() => setOpen(false)}>
          Upload
        </Link>

        {!isAuthed && (
          <>
            <Link to="/login" onClick={() => setOpen(false)}>
              Login
            </Link>

            <Link to="/signup" onClick={() => setOpen(false)}>
              Signup
            </Link>
          </>
        )}

        {isAuthed && (
          <>
            <Link to="/history" onClick={() => setOpen(false)}>
              History
            </Link>

            <Link to="/profile" onClick={() => setOpen(false)}>
              Profile
            </Link>

            <button className="btn-ghost" onClick={logout}>
              Logout
            </button>

            {/* Profile Photo - After Logout */}
            <Link
              to="/profile"
              className="navbar-profile-link"
              title="My Profile"
              onClick={() => setOpen(false)}
            >
              {avatarSrc ? (
                <img
                  key={avatarVersion}
                  src={avatarSrc}
                  alt="Profile"
                  className="navbar-profile-image"
                />
              ) : (
                <span className="navbar-profile-initial">{initials}</span>
              )}
            </Link>
          </>
        )}
      </div>
    </header>
  );
}