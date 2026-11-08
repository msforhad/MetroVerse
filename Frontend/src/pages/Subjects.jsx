import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import API from "../lib/api";
import "../styles/subjects.css";
const departments = [
  { id: 1, shortName: "CSE" },
  { id: 2, shortName: "EEE" },
  { id: 3, shortName: "SE" },
  { id: 4, shortName: "DS" },
  { id: 5, shortName: "BBA" },
  { id: 6, shortName: "ECO" },
  { id: 7, shortName: "LJ" },
  { id: 8, shortName: "ENG" },
  { id: 9, shortName: "JMS" },
];


export default function Subjects() {
  const { deptId, yearId, semId } = useParams();
  const department = departments.find((d) => d.id === Number(deptId));
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await API.get("/subjects", {
          params: { sem_id: semId, dept_id: deptId }
        });
        setSubjects(data || []);
      } catch (e) {
        console.error("Failed to load subjects", e);
        setSubjects([]);
      }
    })();
  }, [deptId, semId]);

  return (
    <div className="container page-padding">
      <h2>Subjects — Dept {department?.shortName||deptId} • Year {yearId} • Sem {semId}</h2>

      <div className="grid">

        <Link
          className="card secondary"
          to={`/upload?dept_id=${deptId}&year_id=${yearId}&sem_id=${semId}`}
        >
          Upload a file to this Semester
        </Link>
      </div>
    </div>
  );
}
