// src/js/main.js

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
        // For demo: accept any teacher login
        localStorage.setItem('userRole', 'teacher');
        window.location.href = 'teacher-dashboard.html';

    } else if (currentRole === 'student') {
        const emailInput = document.getElementById('emailInput');
        const userEmail = emailInput ? emailInput.value.trim().toLowerCase() : '';

        if (!userEmail) {
            alert('Please enter your email.');
            return;
        }

        try {
            const response = await fetch("http://localhost:3001/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email: userEmail })
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
                if (errorEl) errorEl.textContent = "No account found";
            }
        } catch (error) {
            console.error("Login error:", error);
            const errorEl = document.getElementById('loginError');
            if (errorEl) errorEl.textContent = "Error connecting to server.";
        }
    }
}