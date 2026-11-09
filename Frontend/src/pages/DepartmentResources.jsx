import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../lib/api";
import FileCard from "../components/FileCard";
import "../styles/departmentResources.css";

export default function DepartmentResources() {
  const { deptId } = useParams();
  const navigate = useNavigate();

  const [files, setFiles] = useState([]);
  const [department, setDepartment] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadResources = async () => {
      try {
        setLoading(true);
        setError("");

        const [resourceRes, deptRes] = await Promise.all([
          API.get(`/department/${deptId}/resources`),
          API.get("/departments"),
        ]);

        setFiles(resourceRes.data);

        const selectedDept = deptRes.data.find(
          (d) => String(d.dept_id) === String(deptId),
        );

        setDepartment(
          selectedDept?.short_name || selectedDept?.dept_name || "Department",
        );
      } catch (err) {
        console.error("Department Resources Error:", err);

        if (err.response?.status === 401) {
          navigate("/login");
          return;
        }

        setError(
          err.response?.data?.message || "Failed to load department resources.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadResources();
  }, [deptId, navigate]);

  return (
    <div className="container page-padding department-resources">
      <div className="department-resources-header">
        <h1>{department} Resources</h1>
        <p>All available study materials from {department} department.</p>
        <span>{files.length} Resources Available</span>
      </div>

      {loading && <p>Loading resources...</p>}

      {!loading && error && (
        <p className="department-resource-error">{error}</p>
      )}

      {!loading && !error && files.length === 0 && (
        <div className="department-resource-empty">
          <h2>No Resources Found</h2>
          <p>There are currently no uploaded resources in this department.</p>
        </div>
      )}

      {!loading && !error && files.length > 0 && (
        <div className="department-resource-grid">
          {files.map((f) => (
            <div key={f.file_id} className="department-resource-card">
              <div className="department-resource-info">
                <h3>{f.subject_name}</h3>

                {f.course_code && <p>{f.course_code}</p>}

                <div className="department-resource-meta">
                  <span>Year {f.year_name}</span>
                  <span>Semester {f.sem_name}</span>
                </div>

                <strong>{f.file_name}</strong>
              </div>

              <FileCard
                file={{
                  file_id: f.file_id,
                  name: f.file_name,
                  url: f.file_url,
                  type: f.file_type || "File",
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
