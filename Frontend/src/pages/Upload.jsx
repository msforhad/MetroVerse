import { useEffect, useMemo, useState } from "react";
import { useSearchParams,useNavigate } from "react-router-dom";
import CircularProgress from "@mui/material/CircularProgress";
import API from "../lib/api";
import "../styles/upload.css";
import toast from "react-hot-toast";
export default function Upload() {
  const [sp] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const presetDept = sp.get("dept_id");
  const presetYear = sp.get("year_id");
  const presetSem  = sp.get("sem_id");
  const presetSubject = sp.get("subject_id");
  
const navigate=useNavigate();
  const locked = useMemo(() => ({
    dept: !!presetDept,
    year: !!presetYear,
    sem:  !!presetSem,
  }), [presetDept, presetYear, presetSem]);

  const [departments, setDepartments] = useState([]);
  const [years, setYears] = useState([]);
  const [sems, setSems] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const [form, setForm] = useState({
    dept_id: presetDept || "",
    year_id: presetYear || "",
    sem_id:  presetSem  || "",
    subject_id: presetSubject || "",
    display_name: "",
    file: null,
  });

  useEffect(() => {
    (async () => {
      try {
        const [{ data: d1 }, { data: d2 }] = await Promise.all([
          API.get("/departments"),
          API.get("/years"),
        ]);
        setDepartments(Array.isArray(d1) ? d1 : []);
        setYears(Array.isArray(d2) ? d2 : []);
      } catch (e) {
        console.error("Failed to load base combos", e);
        setDepartments([]);
        setYears([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (!form.year_id) { setSems([]); return; }
    (async () => {
      try {
        const { data } = await API.get("/semesters", { params: { year_id: form.year_id } });
        setSems(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Failed to load semesters", e);
        setSems([]);
      }
    })();
  }, [form.year_id]);

  useEffect(() => {
    if (!form.sem_id || !form.dept_id) { setSubjects([]); return; }
    (async () => {
      try {
        const { data } = await API.get("/subjects", {
          params: { sem_id: form.sem_id, dept_id: form.dept_id },
        });
        setSubjects(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Failed to load subjects", e);
        setSubjects([]);
      }
    })();
  }, [form.sem_id, form.dept_id]);

  const onChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "file") setForm((p) => ({ ...p, file: files?.[0] || null }));
    else setForm((p) => ({ ...p, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.dept_id || !form.year_id || !form.sem_id || !form.subject_id || !form.file) {
      toast.error("Please complete all required fields and choose a file.");
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("dept_id", form.dept_id);
      fd.append("year_id", form.year_id);
      fd.append("sem_id", form.sem_id);
      fd.append("subject_id", form.subject_id);
      fd.append("display_name", form.display_name || "");
      fd.append("file", form.file);

      const token = localStorage.getItem("token");
const { data } = await API.post("/upload", fd, {
  headers: { 
    "Content-Type": "multipart/form-data",
    Authorization: `Bearer ${token}`
  },
});
 toast.success(data?.message || "Uploaded successfully");
navigate("/");
      setForm((p) => ({ ...p, display_name: "", file: null }));
    } catch (e) {
      console.error("Upload failed", e);
      toast.error(e.response?.data?.message || "Upload failed");
    }finally{
      setLoading(false);
    }
  };
  if (loading) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        width: "100%"
      }}>
        <CircularProgress />
        Uploading Please wait...
      </div>
    );
  }

  return (
    <div className="container page-padding">
      <h2>Upload File</h2>
      <form className="upload-form" onSubmit={onSubmit}>
        <div className="row">
          <label>Department</label>
          <select
            name="dept_id"
            value={form.dept_id}
            onChange={onChange}
            disabled={locked.dept}
          >
            <option value="">Select</option>
            {departments.map((d) => (
              <option key={d.dept_id} value={d.dept_id}>{d.dept_name}</option>
            ))}
          </select>
        </div>

        <div className="row">
          <label>Year</label>
          <select
            name="year_id"
            value={form.year_id}
            onChange={onChange}
            disabled={locked.year}
          >
            <option value="">Select</option>
            {years.map((y) => (
              <option key={y.year_id} value={y.year_id}>{y.year_name}</option>
            ))}
          </select>
        </div>

        <div className="row">
          <label>Semester</label>
          <select
            name="sem_id"
            value={form.sem_id}
            onChange={onChange}
            disabled={locked.sem}
          >
            <option value="">Select</option>
            {sems.map((s) => (
              <option key={s.sem_id} value={s.sem_id}>{s.sem_name}</option>
            ))}
          </select>
        </div>

        <div className="row">
          <label>Subject</label>
          <select
            name="subject_id"
            value={form.subject_id}
            onChange={onChange}
          >
            <option value="">Select</option>
            {subjects.map((s) => (
              <option key={s.subject_id} value={s.subject_id}>{s.subject_name}</option>
            ))}
          </select>
        </div>

        <div className="row">
          <label>Display Name (optional)</label>
          <input
            type="text"
            name="display_name"
            value={form.display_name}
            onChange={onChange}
            placeholder="E.g., 'DS Unit-2 Notes'"
          />
        </div>
        <div className="row">
          <label>File</label>
          <input type="file" name="file" onChange={onChange} accept=".pdf,.jpg,.jpeg,.png" />
        </div>
 <button type="submit" className="btn-primary" disabled={loading}>Upload File</button>
      </form>
    </div>
  );
}
