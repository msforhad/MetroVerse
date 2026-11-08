import { useEffect, useState } from "react";
import API from "../lib/api";
import FileCard from "../components/FileCard";
import "../styles/filespage.css";

export default function History() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await API.get("/history");
        setItems(data || []);
      } catch (e) {
        console.error("Failed to load history", e);
        setItems([]);
      }
    })();
  }, []);

  return (
    <div className="container page-padding">
      <h2>Your Download History</h2>

      {items.length === 0 && (
        <p style={{ marginTop: 12 }}>No downloads yet.</p>
      )}

      <div className="grid">
        {items.map((h) => (
          <FileCard
            key={h.history_id}
            file={{
              file_id: h.file_id,
              name: h.file_name,
              url: h.file_url,
              type: h.file_type,
            }}
          />
        ))}
      </div>
    </div>
  );
}
