import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import API from "../lib/api";
import "../styles/semester.css";
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

export default function Semester() {
  const { deptId, yearId } = useParams();
  const department = departments.find((d) => d.id === Number(deptId));
  const [sems, setSems] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await API.get("/semesters", { params: { year_id: yearId } });
        setSems(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Failed to load semesters", e);
        setSems([
          { sem_id: 1, sem_name: "1-1" },
          { sem_id: 2, sem_name: "1-2" },
        ]);
      }
    })();
  }, [yearId]);

  return (
    <div className="container page-padding">
      <h2>Select Semester — Dept {department?.shortName||deptId} • Year {yearId}</h2>

      <div className="grid">
        {sems.map((s) => (
          <Link
            key={s.sem_id}
            to={`/dept/${deptId}/year/${yearId}/sem/${s.sem_id}/subjects`}
            className="card"
          >
            {s.sem_name}
          </Link>
        ))}
      </div>
    </div>
  );
}
