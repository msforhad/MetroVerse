import { useNavigate } from "react-router-dom";
import API from "../lib/api";
import "../styles/filecard.css";
import pdfIcon from "../assets/pdf_image.png";

export default function FileCard({ file }) {
  const navigate = useNavigate();

  const addHistory = async () => {
    try {
      await API.post("/history/add", {
        file_id: file.file_id,
      });
    } catch (err) {
      console.error("History save failed", err);
    }
  };

  const handleReadOnline = () => {
    navigate(`/read/${file.file_id}`);
  };

  const handleDownload = async () => {
    try {
      await addHistory();
      window.open(file.url, "_blank");
    } catch (err) {
      console.error("Download error:", err);
    }
  };

  return (
    <div className="file-card card">
      <img className="file-icon" src={pdfIcon} alt="pdf" />

      <div className="name">{file.name || file.file_name}</div>

      <div className="small">{file.type || file.file_type || "PDF"}</div>

      <div className="file-actions">
        <button className="read-btn" onClick={handleReadOnline}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 7v14" />
            <path d="M3 18V5a2 2 0 0 1 2-2h3a4 4 0 0 1 4 4 4 4 0 0 1 4-4h3a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2h-5a4 4 0 0 0-4 2 4 4 0 0 0-4-2H5a2 2 0 0 1-2-2Z" />
          </svg>
          Read Online
        </button>

        <button className="download-btn" onClick={handleDownload}>
          ⬇ Download
        </button>
      </div>
    </div>
  );
}
