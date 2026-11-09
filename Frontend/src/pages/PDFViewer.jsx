import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../lib/api";
import "../styles/pdfViewer.css";

export default function PDFViewer() {
  const { fileId } = useParams();
  const navigate = useNavigate();

  const [pdfUrl, setPdfUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let objectUrl;

    const loadPDF = async () => {
      try {
        const [pdfResponse] = await Promise.all([
          API.get(`/files/${fileId}/view`, {
            responseType: "blob",
          }),
          API.post("/history/add", {
            file_id: fileId,
          }),
        ]);

        const blob = new Blob([pdfResponse.data], {
          type: "application/pdf",
        });

        objectUrl = URL.createObjectURL(blob);
        setPdfUrl(objectUrl);
      } catch (err) {
        console.error("PDF Viewer Error:", err);
        setError(err.response?.data?.message || "Failed to open PDF.");
      } finally {
        setLoading(false);
      }
    };

    loadPDF();

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [fileId]);

  return (
    <div className="pdf-viewer-page">

      {loading && <p>Opening PDF...</p>}

      {error && <p className="pdf-viewer-error">{error}</p>}

      {pdfUrl && (
        <iframe
          src={pdfUrl}
          title="MetroVerse PDF Reader"
          className="pdf-frame"
        />
      )}
    </div>
  );
}
