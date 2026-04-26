// src/js/main.js
const API_BASE = "https://hq-dopamine-ps-04-undt.vercel.app";

let currentRole = null;

function selectRole(role) {
    currentRole = role;
    const body = document.body;
    const loginPanel = document.getElementById('enterPanel');
    const loginTitle = document.getElementById('enterTitle');
    const teacherCard = document.getElementById('teacherCard');
    const studentCard = document.getElementById('studentCard');
    const loginBtn = document.getElementById('enterBtn');

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

async function handleLogin(e) {
    e.preventDefault();

    if (currentRole === 'teacher') {
        const email = document.getElementById('emailInput').value.trim().toLowerCase();
        const password = document.getElementById('passwordInput').value.trim();
        
        if (!email || !password) {
            document.getElementById('loginError').textContent = 'Please fill all fields.';
            return;
        }
        
        try {
            const response = await fetch(`${API_BASE}/teacher-login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const result = await response.json();
            
            if (result.success) {
                localStorage.setItem('userRole', 'teacher');
                localStorage.setItem('teacherData', JSON.stringify(result.teacher));
                window.location.href = 'teacher-dashboard.html';
            } else {
                document.getElementById('loginError').textContent = result.message;
            }
        } catch (err) {
            document.getElementById('loginError').textContent = 'Error connecting to server.';
        }
    } else if (currentRole === 'student') {
        const userEmail = document.getElementById('emailInput').value.trim().toLowerCase();
        const userPassword = document.getElementById('passwordInput').value.trim();
        
        if (!userEmail || !userPassword) {
            document.getElementById('loginError').textContent = 'Please enter email and password.';
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email: userEmail, password: userPassword })
            });

            const result = await response.json();

            if (result.success) {
                console.log("Login successful:", result.student);
                localStorage.setItem('userRole', 'student');
                localStorage.setItem('studentRoll', result.student.rollNo);
                
                window.location.href = 'student-dashboard.html';
            } else {
                console.log("Login failed:", result.message);
                const errorEl = document.getElementById('loginError');
                if (errorEl) errorEl.textContent = result.message;
            }
        } catch (error) {
            console.error("Login error:", error);
            const errorEl = document.getElementById('loginError');
            if (errorEl) errorEl.textContent = "Error connecting to server.";
        }
    }
}