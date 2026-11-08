import { Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Years from "./pages/Years";
import Semester from "./pages/Semester";
import Subjects from "./pages/Subjects";
import FilesPage from "./pages/FilesPage";
import Upload from "./pages/Upload";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Footer from "./components/Footer";
import History from "./pages/History";
import ProfilePage from "./pages/ProfilePage";
import ProtectedRoute from "./components/ProtectedRoute";
import {Toaster} from 'react-hot-toast';
export default function App() {
  const location = useLocation();
  const hideNav = location.pathname === "/login" || location.pathname === "/signup";

  return (
  <>
    {!hideNav && <Navbar />}
    <Toaster position="top-right"/>
    <main>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/dept/:deptId/years"
          element={
            <ProtectedRoute>
              <Years />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dept/:deptId/year/:yearId"
          element={
            <ProtectedRoute>
              <Semester />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dept/:deptId/year/:yearId/sem/:semId/subjects"
          element={
            <ProtectedRoute>
              <Subjects />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dept/:deptId/year/:yearId/sem/:semId/files"
          element={
            <ProtectedRoute>
              <FilesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/upload"
          element={
            <ProtectedRoute>
              <Upload />
            </ProtectedRoute>
          }
        />

        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <History />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
       <Route path="*" element={<h2><strong><big>404</big></strong>Page Not Found</h2>} />
      </Routes>
    </main>
    <Footer />
  </>
);
}
