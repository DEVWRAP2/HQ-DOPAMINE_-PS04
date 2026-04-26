# TeacherFlow AI

> AI-powered classroom intelligence — detect learning gaps early, act before students fall behind.

## What It Does

TeacherFlow AI gives teachers real-time visibility into every student's performance across subjects and topics, automatically flagging struggling students and generating Gemini-powered insights. Students get a personal dashboard showing their scores, attendance, weak areas, and AI-generated action plans.

## Live Demo

- **Frontend:** https://hq-dopamine-ps-04-43c3.vercel.app
- **Backend API:** https://hq-dopamine-ps-04-undt.vercel.app

## Test Credentials

| Role | Email | Password |
|---|---|---|
| Teacher (Math) | raj.kumar@teacherflow.edu | raj123 |
| Teacher (Chemistry) | priya.nair@teacherflow.edu | priya123 |
| Teacher (Physics) | arun.mehta@teacherflow.edu | arun123 |
| Student | aarav.sharma@gmail.com | aarav.123 |
| student | sneha.kapoor@gmail.com | sneha.123 |
| student | priya.vermar@gmail.com | priya.123 |

## Features

**Teacher Dashboard**
- Subject-specific class analytics (Math / Chemistry / Physics)
- Average performance by topic — bar chart from real data
- Students needing attention (score below 50%)
- Weakness detection heatmap
- AI insights per student via Gemini API

**Student Dashboard**
- Personal performance tracking across all subjects
- Topic-wise score breakdown with progress bars
- Attendance calendar
- Assignment completion tracking
- AI-generated weak areas, root cause, and action plan

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, Vanilla JS, Chart.js |
| Backend | Node.js, Express 4 |
| AI | Google Gemini 1.5 Flash |
| Data | JSON (students.json, teachers.json) |
| Deployment | Vercel (frontend + backend) |

## Project Structure

```
HQ-DOPAMINE_-PS04/
├── index.html                  ← Login page
├── student-dashboard.html      ← Student portal
├── teacher-dashboard.html      ← Teacher portal
├── src/
│   ├── css/
│   │   ├── styles.css
│   │   └── dashboard.css
│   └── js/
│       ├── main.js             ← Login logic
│       └── teacher.js          ← Teacher dashboard logic
└── backend/
    ├── server.js               ← Express API
    ├── vercel.json
    └── data/
        ├── students.json       ← 30 students, 18 scores each
        └── teachers.json       ← 3 teachers with subject/class assignments
```

## API Routes

| Method | Route | Description |
|---|---|---|
| POST | /login | Student authentication |
| POST | /teacher-login | Teacher authentication |
| GET | /students | All students |
| GET | /student/:rollNo | Single student |
| GET | /students-by-class/:className | Filter by 10-A, 10-B, 10-C |
| GET | /students-by-subject/:subject | Filter by Math, Chemistry, Physics |
| POST | /ai-insight | Gemini AI analysis for a student |

## Setup

```bash
# Clone
git clone https://github.com/DEVWRAP2/HQ-DOPAMINE_-PS04.git

# Backend
cd backend
npm install
node server.js

# Frontend — open index.html in browser

Built for Devwrap 2.0 — Open Innovation Track
👥 The Team
Built with ❤️ during DevWrap2.0 by: SC ECE @ AOT

1. Samir Kumar Shaw 
2. Samiksha Singh
3. Monomoy Dikshit
4. Mamun Aktar