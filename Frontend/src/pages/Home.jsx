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

const features = [
  {
    icon: "📚",
    title: "Study Materials",
    description: "Find notes, lecture sheets and subject-wise study materials.",
  },
  {
    icon: "📄",
    title: "Online PDF Reading",
    description: "Read your study materials online without downloading them.",
  },
  {
    icon: "⬇️",
    title: "Easy Downloads",
    description: "Download academic resources whenever you need them.",
  },
  {
    icon: "📂",
    title: "Download History",
    description: "Keep track of your previously downloaded resources.",
  },
];

export default function Home() {
  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="hero">
        <div className="university-brand">
          <img src="/university-logo.png" alt="Metropolitan University Logo" />
        </div>

        <h1>
          Welcome to <span>MetroVerse</span>
        </h1>

        <p>
          Your centralized place for notes, previous year papers, unit-wise
          materials, and quick revision resources. Everything you need for your
          academic journey in one place.
        </p>

        <div className="hero-tags">
          <span>Fast</span>
          <span>Organized</span>
          <span>Student-Friendly</span>
        </div>

        <div className="hero-buttons">
          <Link to="/my-resources" className="hero-primary-btn">
            Explore Resources →
          </Link>
          <Link to="/signup" className="hero-secondary-btn">
            Get Started
          </Link>
        </div>
      </section>

      {/* About Section */}
      <section className="about-section">
        <h2>About MetroVerse</h2>
        <p>
          MetroVerse is a student-focused academic resource platform designed to
          make learning easier and more organized. Students can explore
          departments, find semester-wise subjects, and access useful academic
          materials from one platform.
        </p>
      </section>

      {/* Departments Section */}
      <section className="department-section">
        <h2 className="title">Explore Your Department</h2>
        <p className="section-subtitle">
          Choose your department to explore academic resources.
        </p>

        <div className="grid">
          {departments.map((d) => (
            <Link
              key={d.id}
              to={`/dept/${d.id}/resources`}
              className="grid-card"
            >
              <span className="department-short">{d.shortName}</span>
              <span className="department-name">{d.name}</span>
              <span className="department-arrow">Explore →</span>
            </Link>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="how-section">
        <h2>How It Works</h2>
        <p className="section-subtitle">
          Access your academic resources in three simple steps.
        </p>

        <div className="steps-grid">
          <div className="step-card">
            <span>01</span>
            <h3>Choose Department</h3>
            <p>Select your academic department.</p>
          </div>

          <div className="step-card">
            <span>02</span>
            <h3>Select Year & Semester</h3>
            <p>Find your year, semester and subjects.</p>
          </div>

          <div className="step-card">
            <span>03</span>
            <h3>Access Resources</h3>
            <p>Read or download your study materials.</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <h2>What You Can Do With MetroVerse</h2>
        <p className="section-subtitle">
          Useful tools to make your academic life easier.
        </p>

        <div className="features-grid">
          {features.map((feature, index) => (
            <div className="feature-card" key={index}>
              <div className="feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Get Started */}
      <section className="cta-section">
        <h2>Start Your Learning Journey</h2>
        <p>
          Explore academic resources and make your university life more
          organized with MetroVerse.
        </p>

        <div className="cta-buttons">
          <Link to="/signup" className="cta-primary">
            Create Account
          </Link>
          <Link to="/login" className="cta-secondary">
            Sign In
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <h3>MetroVerse</h3>
        <p>Your Campus. Your Resources. Your Future.</p>
        <span>
          © {new Date().getFullYear()} MetroVerse. All rights reserved.
        </span>
      </footer>
    </div>
  );
}

