import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import API from "../lib/api";
import "../styles/navbar.css";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [query, setQ] = useState("");
  const [results, setResults] = useState([]);
  const navigate = useNavigate();

  const isAuthed = !!localStorage.getItem("token");

  useEffect(() => {
    const t = setTimeout(async () => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }
      try {
        const { data } = await API.get("/search-subjects", { params: { query } });
        setResults(data || []);
      } catch (err) {
        console.error("Search failed", err);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [query]);

  const logout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const goToSubject = (s) => {
    setQ("");
    setResults([]);
    navigate(
      `/dept/${s.dept_id}/year/${s.year_id}/sem/${s.sem_id}/files?subject=${s.subject_id}`
    );
  };
  return (
  <header className="nav">


    <div className="nav-left">
      <Link to="/" className="brand">MetroVerse</Link>
    </div>

    <div className="row-two">
      <button className="hamburger" onClick={() => setOpen(p => !p)}>
        <span />
        <span />
        <span />
      </button>

      <div className="search-container">
        <input
          type="text"
          placeholder="Search subjects..."
          value={query}
          onChange={(e) => setQ(e.target.value)}
        />

        {results.length > 0 && (
          <div className="search-results">
            {results.map(s => (
              <div
                key={s.subject_id}
                className="search-item"
                onClick={() => goToSubject(s)}
              >
                <strong>{s.subject_name}</strong>
                <span>{s.dept_name} • {s.year_name} • {s.sem_name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>

    <div className={`nav-links ${open ? "show" : ""}`}>
      <Link to="/" onClick={() => setOpen(false)}>Home</Link>
      <Link to="/upload" onClick={() => setOpen(false)}>Upload</Link>

      {!isAuthed && <Link to="/login" onClick={() => setOpen(false)}>Login</Link>}
      {!isAuthed && <Link to="/signup" onClick={() => setOpen(false)}>Signup</Link>}

      {isAuthed && (
        <>
          <Link to="/history" onClick={() => setOpen(false)}>History</Link>
          <Link to="/profile" onClick={() => setOpen(false)}>Profile</Link>
          <button className="btn-ghost" onClick={logout} >Logout</button>
        </>
      )}
    </div>
  </header>
);

}
