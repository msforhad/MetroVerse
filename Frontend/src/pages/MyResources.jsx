import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../lib/api";
import "../styles/myResources.css";

export default function MyResources() {
  const navigate = useNavigate();

  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadResources = async () => {
      try {
        const res = await API.get("/my-pdf-subjects");
        setSubjects(res.data);
      } catch (err) {
        console.error("My Resources Error:", err);

        if (err.response?.status === 401) {
          navigate("/login");
          return;
        }

        setError(
          err.response?.data?.message ||
            "Failed to load your resources."
        );
      } finally {
        setLoading(false);
      }
    };

    loadResources();
  }, [navigate]);

  const openSubject = (item) => {
    navigate(
      `/dept/${item.dept_id}/year/${item.year_id}/sem/${item.sem_id}/files`
    );
  };

  return (
    <div className="my-resources-container">
      <div className="my-resources-header">
        <h1>My Resources</h1>
        <p>
          Subjects from your department that currently have PDF resources.
        </p>
      </div>

      {loading && (
        <div className="resources-message">
          Loading your resources...
        </div>
      )}

      {!loading && error && (
        <div className="resources-error">
          {error}
        </div>
      )}

      {!loading && !error && subjects.length === 0 && (
        <div className="resources-empty">
          <h2>No PDF Resources Found</h2>
          <p>
            There are currently no PDF resources available for your
            department.
          </p>
        </div>
      )}

      {!loading && !error && subjects.length > 0 && (
        <div className="resources-grid">
          {subjects.map((item) => (
            <div
              key={item.subject_id}
              className="resource-card"
              onClick={() => openSubject(item)}
            >
              <div className="resource-icon">📄</div>

              <div className="resource-info">
                <h3>{item.subject_name}</h3>

                {item.course_code && (
                  <p className="course-code">
                    {item.course_code}
                  </p>
                )}

                <div className="resource-meta">
                  <span>
                    Year {item.year_name}
                  </span>

                  <span>
                    Semester {item.sem_name}
                  </span>
                </div>

                <div className="pdf-count">
                  📄 {item.pdf_count} PDF
                  {item.pdf_count !== 1 ? "s" : ""}
                </div>
              </div>

              <div className="resource-arrow">
                →
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}