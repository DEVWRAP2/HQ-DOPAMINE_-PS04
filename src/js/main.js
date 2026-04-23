// src/js/main.js

let currentRole = null;

// ════════════════════════════════
// STUDENT CREDENTIALS
// Maps email → rollNo from your JSON data
// ════════════════════════════════
const STUDENT_LOGINS = {
    'rahul@student.edu': { password: 'rahul123', rollNo: 'CSE101' },
    'priya@student.edu': { password: 'priya123', rollNo: 'CSE102' },
    'arjun@student.edu': { password: 'arjun123', rollNo: 'CSE103' },
    'sneha@student.edu': { password: 'sneha123', rollNo: 'CSE104' },
    'amit@student.edu': { password: 'amit123', rollNo: 'CSE105' },
    'riya@student.edu': { password: 'riya123', rollNo: 'CSE106' },
    'vikram@student.edu': { password: 'vikram123', rollNo: 'CSE107' },
    'pooja@student.edu': { password: 'pooja123', rollNo: 'CSE108' },
    'suresh@student.edu': { password: 'suresh123', rollNo: 'CSE109' },
    'neha@student.edu': { password: 'neha123', rollNo: 'CSE110' },
    'rohan@student.edu': { password: 'rohan123', rollNo: 'CSE111' },
    'anjali@student.edu': { password: 'anjali123', rollNo: 'CSE112' },
    'karan@student.edu': { password: 'karan123', rollNo: 'CSE113' },
    'divya@student.edu': { password: 'divya123', rollNo: 'CSE114' },
    'tanmay@student.edu': { password: 'tanmay123', rollNo: 'CSE115' },
};

// Teacher credentials (for demo)
const TEACHER_LOGINS = {
    'teacher@school.edu': 'teacher123',
    'anderson@school.edu': 'password123',
};

function selectRole(role) {
    currentRole = role;
    const body = document.body;
    const loginPanel = document.getElementById('loginPanel');
    const loginTitle = document.getElementById('loginTitle');
    const teacherCard = document.getElementById('teacherCard');
    const studentCard = document.getElementById('studentCard');
    const loginBtn = document.getElementById('loginBtn');

    body.classList.remove('state-teacher', 'state-student');

    setTimeout(() => {
        if (role === 'teacher') {
            loginPanel.className = 'panel login-panel right-pos';
            loginTitle.innerText = "Welcome Teacher";
            teacherCard.classList.remove('dimmed');
            studentCard.classList.add('dimmed');
            loginBtn.style.background = "linear-gradient(135deg, #b5838d 0%, #9b6a72 100%)";
            loginBtn.style.boxShadow = "0 8px 20px rgba(181, 131, 141, 0.3)";
            requestAnimationFrame(() => body.classList.add('state-teacher'));
        } else {
            loginPanel.className = 'panel login-panel left-pos';
            loginTitle.innerText = "Welcome Student";
            studentCard.classList.remove('dimmed');
            teacherCard.classList.add('dimmed');
            loginBtn.style.background = "linear-gradient(135deg, #d4a373 0%, #b88a5c 100%)";
            loginBtn.style.boxShadow = "0 8px 20px rgba(212, 163, 115, 0.3)";
            requestAnimationFrame(() => body.classList.add('state-student'));
        }
    }, 50);
}

function resetSelection() {
    currentRole = null;
    const body = document.body;
    document.getElementById('teacherCard').classList.remove('dimmed');
    document.getElementById('studentCard').classList.remove('dimmed');
    body.classList.remove('state-teacher', 'state-student');
}

function handleLogin(e) {
    e.preventDefault();

    if (currentRole === 'teacher') {
        // For demo: accept any teacher login
        localStorage.setItem('userRole', 'teacher');
        window.location.href = 'teacher-dashboard.html';

    } else if (currentRole === 'student') {

        // --- MODIFIED SECTION ---
        // This bypasses the email/password check completely and forces a login
        // as "Rahul Sharma" (Roll Number: CSE101) so you can test the dashboard.

        localStorage.setItem('userRole', 'student');
        localStorage.setItem('studentRoll', 'CSE101');

        window.location.href = 'student-dashboard.html';
    }
}