import { useParams, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import API from "../lib/api";
import FileCard from "../components/FileCard";
import "../styles/filespage.css";

export default function FilesPage() {
  const { deptId, yearId, semId } = useParams();
  const [sp] = useSearchParams();
  const subjectId = sp.get("subject_id") || "";

  const [files, setFiles] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await API.get("/files", {
          params: {
            year_id: yearId,
            sem_id: semId,
            subject_id: subjectId || undefined
          }
        });

        if (!Array.isArray(data) || data.length === 0) {
          setErr("No files found");
          setFiles([]);
          return;
        }

        setFiles(data);
      } catch (e) {
        console.error("Failed to load files", e);
        setErr("Failed to load files");

        setFiles([
          { name: `Sample Notes - Year ${yearId} Sem ${semId}`, url: "/sample/sample1.pdf", type: "PDF" },
          { name: `Sample Paper - Year ${yearId} Sem ${semId}`, url: "/sample/sample2.pdf", type: "PDF" }
        ]);
      }
    })();
  }, [yearId, semId, subjectId]);

  return (
    <div className="container page-padding">
      <h2>
        Files — Dept {deptId} • Year {yearId} • Sem {semId}
        {subjectId && ` • Subject ${subjectId}`}
      </h2>

      {err && <p style={{ color: "red", marginTop: 8 }}>{err}</p>}

      <div className="grid">
        {files.map((f, i) => (
          <FileCard
            key={i}
            file={{
              file_id:f.file_id,
              name: f.file_name || f.name,
              url: f.file_url || f.url,
              type: f.file_type || f.type || "PDF"
            }}
          />
        ))}
      </div>
    </div>
  );
}
