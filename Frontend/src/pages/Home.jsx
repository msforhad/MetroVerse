import { Link } from "react-router-dom";
import "../styles/home.css";

const departments = [
  { id: 1, shortName: "CSE", name: "Computer Science & Eng." },
  { id: 3, shortName: "EEE", name: "Electrical & Electronic Eng." },
  { id: 4, shortName: "SE", name: "Software Eng." },
  { id: 5, shortName: "DS", name: "Data Science" },
  { id: 6, shortName: "BBA", name: "Business Administration" },
  { id: 7, shortName: "ECO", name: "Economics" },
  { id: 8, shortName: "LJ", name: "Law & Justice" },
  { id: 9, shortName: "ENG", name: "English" },
  { id: 10, shortName: "JMS", name: "Journalism & Media Studies" },
];

export default function Home() {
  return (
    <div className="home-container">
      <div className="hero">
      <h1>Welcome to <span>MetroVerse</span></h1>
      <p>
        Your centralized place for notes, previous year papers, unit-wise materials,
        and quick revision resources.
      </p>

      <div className="hero-tags">
        <span>Fast</span>
        <span>Organized</span>
        <span>Student-Friendly</span>
      </div>
    </div>
      <h1 className="title">Select Your Department</h1>
      <div className="grid">
        {departments.map((d) => (
          <Link
            key={d.id}
            to={`/dept/${d.id}/years`}
            className="grid-card"
          >
            {d.name}
          </Link>
        ))}
      </div>
    </div>
  );
}

