// src/js/teacher.js

const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY_HERE';

let students = [];
let rawStudentsData = [];
let myChartInstance = null;

// ════════════════════════════════
// LOAD DATA FROM JSON
// ════════════════════════════════
fetch('src/data/students.json')
    .then(res => res.json())
    .then(data => {
        rawStudentsData = data;
        if (typeof selectClass === 'function') {
            selectClass('cse', 'dashboard');
        }
    })
    .catch(err => {
        console.error('Failed to load student data:', err);
    });

// ════════════════════════════════
// CLASS DATA FILTERING
// ════════════════════════════════
function openClass(className, classType) {
    const titleEl = document.querySelector('.dashboard-header h1');
    const subEl = document.querySelector('.dashboard-header .subtitle');
    if (titleEl) titleEl.innerText = 'Teacher Dashboard';
    if (subEl) subEl.innerText = className;

    let classData = JSON.parse(JSON.stringify(rawStudentsData));

    if (classType === 'ece') {
        classData = classData.slice(0, 3);
        classData.forEach(s => { s.overallScore = Math.min(100, s.overallScore + 15); s.attendance = Math.min(100, s.attendance + 10); });
    } else if (classType === 'aiml') {
        classData = classData.slice(2, 5);
        classData.forEach(s => { s.overallScore = Math.max(0, s.overallScore - 5); s.attendance = Math.max(0, s.attendance - 5); });
    } else if (classType === 'me') {
        classData = classData.slice(1, 4);
        classData.forEach(s => { s.overallScore = Math.min(100, s.overallScore + 5); s.attendance = Math.min(100, s.attendance - 2); });
    } else if (classType === 'ce') {
        classData = classData.slice(3, 6);
        classData.forEach(s => { s.overallScore = Math.max(0, s.overallScore - 10); s.attendance = Math.max(0, s.attendance + 5); });
    }

    students = classData.map(s => ({
        id: s.rollNo,
        name: s.name,
        attendance: s.attendance,
        assignmentsDone: s.assignments ? s.assignments.completed : 0,
        assignmentsTotal: s.assignments ? s.assignments.total : 10,
        effort: s.effortLevel || 'medium',
        overallScore: s.overallScore,
        needHelpTopics: s.needHelpTopics || [],
        tests: s.tests || [],
        topics: (s.topics || []).reduce((acc, t) => {
            acc[t.name] = t.score;
            return acc;
        }, {})
    }));

    initChart();
    populateTable();
}

// ════════════════════════════════
// HELPERS
// ════════════════════════════════
function getAvgScore(topics) {
    const values = Object.values(topics);
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

function getStarRating(score) {
    if (score > 75) return "⭐⭐⭐⭐⭐⭐⭐⭐⭐";
    if (score >= 50) return "⭐⭐⭐⭐⭐⭐";
    return "⭐⭐⭐";
}

function getStatusClass(score) {
    if (score > 75) return "status-green";
    if (score >= 50) return "status-yellow";
    return "status-red";
}

// ════════════════════════════════
// LOCAL FALLBACK INSIGHTS
// (used if Gemini API is unavailable)
// ════════════════════════════════
function generateLocalInsights(student, avgScore) {
    let weakAreas = [];
    let rootCause = "Concepts generally understood.";
    let riskLevel = "Low";
    let actionPlan = "Maintain current study habits.";
    let recommendation = "Encourage advanced reading.";

    Object.entries(student.topics).forEach(([topic, score]) => {
        if (score < 60) weakAreas.push(topic);
    });

    const topicNames = Object.keys(student.topics);
    if (topicNames.includes('Algebra') && topicNames.includes('Calculus')) {
        if (student.topics['Algebra'] < 60 && student.topics['Calculus'] < 60) {
            rootCause = "Weak foundation in Algebra is impacting Calculus comprehension.";
        }
    }

    if (weakAreas.length > 0 && rootCause === "Concepts generally understood.") {
        rootCause = "Needs more practice in specific topic areas.";
    }

    if (student.effort === "high" && avgScore < 60) {
        rootCause += " Student is showing signs of frustration despite high effort.";
        actionPlan = "Schedule 1-on-1 tutoring to identify learning blockers.";
        recommendation = "Provide alternative learning materials. Praise their effort to keep morale high.";
    } else if (student.effort === "low" && avgScore < 60) {
        rootCause += " Student appears disengaged from the material.";
        actionPlan = "Intervention required. Contact parents and review attendance.";
        recommendation = "Try to relate concepts to their personal interests. Set small, achievable goals.";
    }

    if (avgScore < 50 || student.attendance < 70) {
        riskLevel = "High";
        if (avgScore >= 50) actionPlan = "Address attendance issues immediately.";
    } else if (avgScore <= 75) {
        riskLevel = "Medium";
    }

    return {
        weakAreas: weakAreas.length > 0 ? weakAreas.join(", ") : "None detected",
        rootCause,
        riskLevel,
        actionPlan,
        recommendation,
        summary: `Risk: ${riskLevel} | ${weakAreas.length > 0 ? 'Struggling with ' + weakAreas.join(', ') : 'Performing well'}`
    };
}

// ════════════════════════════════
// GEMINI AI — LIVE INSIGHTS
// ════════════════════════════════
async function getAIInsights(student) {
    const recEl = document.getElementById('aiRecommendation');
    const weakEl = document.getElementById('aiWeakAreas');
    const rootEl = document.getElementById('aiRootCause');
    const riskEl = document.getElementById('aiRiskLevel');
    const planEl = document.getElementById('aiActionPlan');

    recEl.innerText = '🤖 Generating AI insights...';

    const topicSummary = Object.entries(student.topics)
        .map(([k, v]) => `${k}: ${v}%`)
        .join(', ');

    const prompt = `You are TeacherFlow AI, an intelligent assistant built into a student performance management platform. Analyze this student's data and provide structured insights.

Student: ${student.name}
Attendance: ${student.attendance}%
Overall Score: ${student.overallScore}%
Effort Level: ${student.effort}
Topics Needing Help: ${student.needHelpTopics.join(', ') || 'None'}
Topic Scores: ${topicSummary}
Test History: ${student.tests.map(t => t.name + ': ' + t.score + '%').join(', ')}

Respond ONLY in this exact JSON format with no extra text:
{
  "weakAreas": "comma separated weak topics or None detected",
  "rootCause": "one sentence explaining why the student is struggling",
  "riskLevel": "High or Medium or Low",
  "actionPlan": "one specific action the teacher should take",
  "recommendation": "2-3 sentences of detailed teaching recommendation"
}`;

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            }
        );

        const data = await response.json();
        const rawText = data.candidates[0].content.parts[0].text;
        const cleaned = rawText.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(cleaned);

        weakEl.innerText = parsed.weakAreas;
        rootEl.innerText = parsed.rootCause;

        riskEl.innerText = parsed.riskLevel;
        riskEl.style.color = parsed.riskLevel === 'High'
            ? 'var(--danger)'
            : parsed.riskLevel === 'Medium'
                ? 'var(--warning)'
                : 'var(--success)';
        riskEl.style.fontWeight = 'bold';

        planEl.innerText = parsed.actionPlan;
        recEl.innerText = parsed.recommendation;

    } catch (err) {
        // Fallback to local logic silently
        const avgScore = getAvgScore(student.topics);
        const local = generateLocalInsights(student, avgScore);

        weakEl.innerText = local.weakAreas;
        rootEl.innerText = local.rootCause;

        riskEl.innerText = local.riskLevel;
        riskEl.style.color = local.riskLevel === 'High'
            ? 'var(--danger)'
            : local.riskLevel === 'Medium'
                ? 'var(--warning)'
                : 'var(--success)';
        riskEl.style.fontWeight = 'bold';

        planEl.innerText = local.actionPlan;
        recEl.innerText = local.recommendation;
    }
}

// ════════════════════════════════
// CHART INIT
// ════════════════════════════════
function initChart() {
    const ctx = document.getElementById('performanceChart');
    if (!ctx) return;

    if (myChartInstance) {
        myChartInstance.destroy();
    }

    const topicNames = Object.keys(students[0]?.topics || {});
    const topicAverages = topicNames.map(topic => {
        const total = students.reduce((sum, s) => sum + (s.topics[topic] || 0), 0);
        return students.length ? Math.round(total / students.length) : 0;
    });

    myChartInstance = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: topicNames,
            datasets: [{
                label: 'Class Average %',
                data: topicAverages,
                backgroundColor: ['#b08968', '#ddb892', '#e8ecef', '#c9a882'],
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, max: 100 }
            },
            plugins: { legend: { display: false } }
        }
    });
}

// ════════════════════════════════
// STUDENT TABLE
// ════════════════════════════════
function populateTable() {
    const tbody = document.getElementById('studentTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    students.forEach(student => {
        const avgScore = getAvgScore(student.topics);
        const local = generateLocalInsights(student, avgScore);
        const statusClass = getStatusClass(avgScore);

        const tr = document.createElement('tr');
        tr.onclick = () => openStudentDetail(student.id);
        tr.innerHTML = `
      <td><strong>${student.name}</strong></td>
      <td>${student.attendance}%</td>
      <td><span class="status-badge ${statusClass}">${avgScore}%</span></td>
      <td style="font-size:0.8rem;">${getStarRating(avgScore)}</td>
      <td class="ai-summary">${local.summary}</td>
    `;
        tbody.appendChild(tr);
    });
}

// ════════════════════════════════
// STUDENT DETAIL MODAL
// ════════════════════════════════
function openStudentDetail(studentId) {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    const avgScore = getAvgScore(student.topics);

    document.getElementById('modalStudentName').innerText = student.name;
    document.getElementById('modalAttendance').innerText = student.attendance + '%';
    document.getElementById('modalAssignments').innerText = student.assignmentsDone + '/' + (student.assignmentsTotal || 10);

    const scoreEl = document.getElementById('modalAvgScore');
    scoreEl.innerText = avgScore + '%';
    scoreEl.className = getStatusClass(avgScore);

    const topicList = document.getElementById('modalTopicList');
    topicList.innerHTML = '';
    Object.entries(student.topics).forEach(([topic, score]) => {
        topicList.innerHTML += `
      <li>
        <span>${topic}</span>
        <span class="status-badge ${getStatusClass(score)}">${score}%</span>
      </li>`;
    });

    // Set placeholder text while AI loads
    document.getElementById('aiWeakAreas').innerText = '...';
    document.getElementById('aiRootCause').innerText = '...';
    document.getElementById('aiRiskLevel').innerText = '...';
    document.getElementById('aiActionPlan').innerText = '...';
    document.getElementById('aiRecommendation').innerText = '🤖 Loading AI insights...';

    document.getElementById('studentModal').classList.add('active');

    // Call Gemini AI
    getAIInsights(student);
}

function closeStudentDetail() {
    document.getElementById('studentModal').classList.remove('active');
}

document.addEventListener('DOMContentLoaded', () => {
    // Data loads via fetch above, chart and table render after
});