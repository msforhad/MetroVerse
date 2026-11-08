import API from "../lib/api";
import "../styles/filecard.css";
import pdfIcon from "../assets/pdf_image.png";
export default function FileCard({ file }) {
  const addHistory = async () => {
    try {
  await API.post(
    "/history/add",
    { file_id: file.file_id },
    { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
  );
} catch (err) {
  console.error("History save failed", err);
}
  };

  const handleDownload = () => {
    addHistory();
    window.open(file.url, "_blank");
  };

  return (
    <div className="file-card card">
      <img className="file-icon" src={pdfIcon} alt="pdf" />

      <div className="name">{file.name || file.file_name}</div>
      <div className="small">{file.type || file.file_type || "PDF"}</div>

      <button className="download-btn" onClick={handleDownload}>
        Download
      </button>
    </div>
  );
}


