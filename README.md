# 📘 StudyVerse – Notes Sharing Platform

A full-stack academic resource platform where students can **upload, browse, and download notes** organized by **Department → Year → Semester → Subject**.  
Designed to simplify study material sharing using clean architecture, JWT auth, and GitHub CDN file storage.

---

## 🚀 Live Demo
**Frontend:** https://notes-sharing-platform-project.vercel.app  (Deployed Url)
**Backend API:** https://heartfelt-presence-production.up.railway.app  (This is a secured url better not to use it )
**Database:** PostgreSQL (Railway)

---

## 🔑 Demo Login (For Recruiters)

Use these credentials to explore the platform:
Email: demo.login@gmail.com
Password: demo@1234

> ⚠️ **Note:** These are demo credentials only for recruiter preview and safe testing.

---

## 🧠 Overview

StudyVerse allows students to:

- Upload academic notes with metadata  
- Browse structured categories  
- Download files easily  
- Track download history  
- Avoid duplicate uploads  
- Use secure login with JWT  

Built with **React + Express + PostgreSQL**, deployed fully on cloud services.

---

## ✨ Features

### 🎓 Student Features
- Browse notes by **Department → Year → Semester → Subject**
- View & download study materials
- File search by filename
- Personal download history page

### 📤 Uploader Features
- Upload **PDF, JPG, JPEG, PNG, DOCX** files
- Metadata selection: dept, year, sem, subject
- Custom display name support
- Duplicate file protection (same subject & file)
- Files stored via **GitHub Raw CDN**

### 🔐 Authentication
- Login / Signup with JWT  
- Secure password hashing using bcrypt  
- Protected API routes  

### ⚡ Performance & Architecture
- Indexed PostgreSQL tables
- Optimized SQL queries  
- Clean REST API structure  
- Multer for handling file uploads  
- Environment-based configuration  

---

## 🛠️ Tech Stack

### **Frontend**
- React (Vite)
- React Router
- Axios
- React Hot Toast
- Material UI (Loader & UI elements)

### **Backend**
- Node.js + Express
- Multer (file uploads)
- PostgreSQL (pg)
- JWT Authentication
- bcrypt
- dotenv

### **Deployment**
- **Frontend:** Vercel  
- **Backend:** Railway  
- **Database:** Railway PostgreSQL  
- **File Storage:** GitHub (Raw CDN URLs)

---

## 🏛️ Architecture
Frontend (Vercel)
↓ API Calls
Backend (Railway - Express)
↓ SQL Queries
PostgreSQL (Railway)
↑ File URL Storage
GitHub (Raw CDN for Files)

---

## 📡 API Endpoints

### 🔐 Auth
POST /auth/signup
POST /auth/login
GET /auth/profile

### 📚 Academic Data
GET /departments
GET /years
GET /semesters?year_id=
GET /subjects?sem_id=&dept_id=
GET /files
GET /file/:id

### 📤 Upload
POST /upload (Protected – Requires JWT)

---

## 🗄 Database Structure

- **departments**
- **years**
- **semesters**
- **subjects** (linked to sem + dept)
- **files** (stored with metadata + GitHub URL)
- **users**
- **history** (download tracking)

Includes:

- Foreign keys  
- Unique constraints  
- Indexing for fast search  


---

## 🗄 Database Structure

- **departments**
- **years**
- **semesters**
- **subjects** (linked to sem + dept)
- **files** (stored with metadata + GitHub URL)
- **users**
- **history** (download tracking)

Includes:

- Foreign keys  
- Unique constraints  
- Indexing for fast search  

---

## 🧩 Folder Structure

StudyVerse/
│
├── frontend/ # React (Vite)
│ ├── src/
│ ├── public/
│ └── vite.config.js
│
├── backend/ # Express API
│ ├── routes/
│ ├── middleware/
│ ├── uploads/
│ └── server.js
│
└── README.md

---

## ⚙️ Environment Variables

### **Backend (.env)**
DATABASE_URL=private_postgres_url
JWT_SECRET=private_secret_key
GITHUB_TOKEN=private_github_token
PORT=3000;

### **Frontend (.env)**
VITE_API_URL=https://heartfelt-presence-production.up.railway.app

---

## 📥 Local Installation

### 1️⃣ Clone the project
###bash
git clone https://github.com/saicharan4316/notes_sharing_platform_project
cd StudyVerse
### Backend commands
cd backend
npm install
npm start

###Front end commands
cd frontend
npm install
npm run dev

👨‍💻 Author

Sai Charan Goud
B.Tech CSE — Full Stack Developer

📧 Email: saicharan.webdev@gmail.com

🐙 GitHub: https://github.com/saicharan4316

💼 LinkedIn: https://www.linkedin.com/in/sai-charan-206124303



