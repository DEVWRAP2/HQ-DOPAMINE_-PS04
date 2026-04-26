// src/js/teacher.js

const API_BASE = "https://hq-dopamine-ps-04-undt.vercel.app";
const teacherData = JSON.parse(localStorage.getItem('teacherData') || '{}');

const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY_HERE';

let students = [];
let rawStudentsData = [];
let currentClassLabel = 'Class 10-A';
let performanceChartInstance = null;
let trendChartInstance = null;
let weaknessChartInstance = null;
let currentClassId = null;

const SUBJECT_TOPICS = {
    Math: ['Algebra', 'Trigonometry', 'Calculus', 'Statistics', 'Geometry', 'Probability'],
    Chemistry: ['Periodic Table', 'Atomic Structure', 'Organic Chemistry', 'Chemical Bonding', 'Acids & Bases', 'Solutions'],
    Physics: ['Mechanics', 'Motion', 'Electricity', 'Magnetism', 'Optics', 'Waves']
};

function getTeacherTopics() {
    const subjectMap = { Mathematics: 'Math' };
    const normalized = subjectMap[teacherData.subject] || teacherData.subject;
    return SUBJECT_TOPICS[normalized] || [];
}

function mapClassData(classData, className) {
    const teacherTopics = getTeacherTopics();
    return classData.map(s => ({
        id: s.rollNo,
        name: s.name,
        className: className,
        attendance: s.attendance,
        assignmentsDone: s.assignments ? s.assignments.completed : 0,
        assignmentsTotal: s.assignments ? s.assignments.total : 10,
        effort: s.effortLevel || 'medium',
        overallScore: (() => {
            const filtered = (s.topics || []).filter((t) => teacherTopics.includes(t.name));
            if (!filtered.length) return 0;
            return Math.round((filtered.reduce((sum, t) => sum + t.score, 0) / filtered.length) * 10) / 10;
        })(),
        needHelpTopics: s.needHelpTopics || [],
        tests: s.tests || [],
        rawScores: s.scores || [],
        rawAttendance: s.rawAttendance || s.attendanceRecords || s.attendanceHistory || s.attendanceData || [],
        topics: (s.topics || []).reduce((acc, t) => {
            if (teacherTopics.includes(t.name)) {
                acc[t.name] = t.score;
            }
            return acc;
        }, {})
    }));
}

// ════════════════════════════════
// CLASS DATA FILTERING
// ════════════════════════════════
async function selectClass(className) {
    if (teacherData.classes && !teacherData.classes.includes(className)) {
        console.warn('Teacher does not have access to ' + className);
        return;
    }
    currentClassId = className;
    try {
        const res = await fetch(API_BASE + '/students-by-class/' + className);
        const classData = await res.json();
        rawStudentsData = classData;
        students = mapClassData(Array.isArray(classData) ? classData : [], className);
        currentClassLabel = 'Class ' + className;
        renderDashboardSection();
        populateTable();
        renderAlertsSection();
    } catch (err) {
        console.error('Failed to fetch class data:', err);
    }
}

async function openClass(className, classType) {
    if (teacherData.classes && !teacherData.classes.includes(classType)) {
        console.warn('Teacher does not have access to ' + classType);
        return; // Only show classes that are in teacherData.classes array
    }

    const titleEl = document.querySelector('.dashboard-header h1');
    const subEl = document.querySelector('.dashboard-header .subtitle');
    if (titleEl) titleEl.innerText = teacherData.name ? `Teacher Dashboard - ${teacherData.name}` : 'Teacher Dashboard';
    if (subEl) subEl.innerText = `${teacherData.subject || 'Subject'} · ${className}`;

    await selectClass(classType);
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

function escapeHtml(value) {
    if (typeof value !== 'string') return value;
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getTrendIcon(student) {
    const tests = student.tests || [];
    if (tests.length < 2) return '→';
    const first = tests[0].score || 0;
    const last = tests[tests.length - 1].score || 0;
    if (last > first) return '↑';
    if (last < first) return '↓';
    return '→';
}

function getTrendClass(icon) {
    if (icon === '↑') return 'trend-up';
    if (icon === '↓') return 'trend-down';
    return 'trend-stable';
}

function renderRecentAlerts() {
    const list = document.getElementById('recentAlertsList');
    if (!list) return;
    const atRisk = students
        .filter((student) => student.overallScore < 60)
        .sort((a, b) => a.overallScore - b.overallScore)
        .slice(0, 3);

    list.innerHTML = atRisk.map((student) => `
        <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #e5e7eb;">
            <span style="font-size:1.2rem">⚠️</span>
            <div>
                <div style="font-size:0.9rem;font-weight:600">${escapeHtml(student.name)} — ${student.overallScore}%</div>
                <div style="font-size:0.8rem;color:#888">This week</div>
            </div>
        </div>
    `).join('') || '<p style="color:#888;font-size:0.9rem;padding:12px 0;">No critical alerts.</p>';
}

function getDismissedAlerts() {
    try {
        return JSON.parse(localStorage.getItem('dismissedAlerts') || '[]');
    } catch (err) {
        return [];
    }
}

function saveDismissedAlerts(ids) {
    localStorage.setItem('dismissedAlerts', JSON.stringify(ids));
}

function dismissAlert(studentId) {
    const dismissed = getDismissedAlerts();
    if (!dismissed.includes(studentId)) {
        dismissed.push(studentId);
        saveDismissedAlerts(dismissed);
    }

    const card = document.getElementById(`alert-card-${studentId}`);
    if (card) {
        card.style.transition = 'opacity 0.25s ease';
        card.style.opacity = '0';
        setTimeout(() => {
            renderAlertsSection();
        }, 250);
    } else {
        renderAlertsSection();
    }
}

function renderAlertsSection() {
    const section = document.getElementById('section-alerts');
    if (!section) return;

    const dismissed = getDismissedAlerts();
    const filtered = students
        .filter((student) => student.overallScore < 60)
        .filter((student) => !dismissed.includes(student.id));

    const cardsHtml = filtered.map((student) => `
        <div id="alert-card-${student.id}" style="background:#fff;border-radius:12px;padding:14px 16px;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;gap:12px;">
            <div>
                <div style="font-weight:700;color:#1f2937;">${escapeHtml(student.name)}</div>
                <div style="font-size:0.85rem;color:#6b7280;">Class ${escapeHtml(student.className)} · ${escapeHtml(teacherData.subject)} · ${student.overallScore}%</div>
            </div>
            <button style="background:#d4af37;color:#fff;border:none;border-radius:8px;padding:8px 12px;cursor:pointer;font-weight:600;" onclick="dismissAlert('${student.id}')">Mark as Done</button>
        </div>
    `).join('');

    section.innerHTML = `
        <button onclick="goBack()" style="background:none; border:none; color:var(--primary); font-weight:600; font-size:1rem; cursor:pointer; margin-bottom:20px; display:flex; align-items:center; gap:5px;">← Back</button>
        <div class="alerts-page">
            <h2>Alerts</h2>
            <p class="page-sub">${filtered.length ? 'Students needing attention' : 'No alerts at this time. All students are above 60%.'}</p>
            ${cardsHtml}
        </div>
    `;
}

function renderNeedsAttention() {
    const tbody = document.getElementById('needsAttentionTableBody');
    if (!tbody) return;

    const needsAttention = students
        .filter((s) => s.overallScore < 50)
        .sort((a, b) => a.overallScore - b.overallScore);

    if (!needsAttention.length) {
        tbody.innerHTML = '<tr><td colspan="5">All students performing above 50%</td></tr>';
        return;
    }

    tbody.innerHTML = needsAttention.map((student) => {
        const gapTopic = Object.entries(student.topics)
            .sort((a, b) => a[1] - b[1])[0]?.[0] || 'General Review';
        return `
            <tr onclick="openStudentModal('${student.id}')">
                <td><strong>${escapeHtml(student.name)}</strong></td>
                <td>${escapeHtml(student.className)}</td>
                <td style="color:#ef4444;">${student.overallScore}%</td>
                <td>↘</td>
                <td>${escapeHtml(gapTopic)}</td>
            </tr>
        `;
    }).join('');
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

    if (performanceChartInstance) {
        performanceChartInstance.destroy();
    }

    const topicNames = getTeacherTopics();
    const topicAverages = topicNames.map(topic => {
        const validScores = students.map((s) => s.topics[topic]).filter((s) => typeof s === 'number');
        if (!validScores.length) return 0;
        return Math.round((validScores.reduce((sum, score) => sum + score, 0) / validScores.length) * 10) / 10;
    });

    performanceChartInstance = new Chart(ctx.getContext('2d'), {
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

function initTrendChart() {
    const trendCanvas = document.getElementById('trendChart');
    if (!trendCanvas) return;
    if (trendChartInstance) { trendChartInstance.destroy(); trendChartInstance = null; }

    const subjectMatch = { 'Math': 'Math', 'Chemistry': 'Chemistry', 'Physics': 'Physics' };
    const targetSubject = subjectMatch[teacherData.subject] || teacherData.subject;

    const weekDates = [
        ['2026-04-01', '2026-04-02'],
        ['2026-04-07', '2026-04-08'],
        ['2026-04-14'],
        ['2026-04-21']
    ];

    const weeklyAverages = weekDates.map(dates => {
        const allMarks = [];
        students.forEach((student) => {
            if (!student.rawScores) return;
            student.rawScores.forEach(score => {
                if (dates.includes(score.date) && score.subject === targetSubject) {
                    allMarks.push(score.marks);
                }
            });
        });
        if (allMarks.length === 0) return 0;
        return Math.round(allMarks.reduce((a, b) => a + b, 0) / allMarks.length);
    });

    console.log('Trend weeklyAverages:', weeklyAverages);
    console.log('Students with rawScores:', students.filter(s => s.rawScores && s.rawScores.length > 0).length);

    trendChartInstance = new Chart(trendCanvas.getContext('2d'), {
        type: 'line',
        data: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            datasets: [{
                label: 'Weekly Avg Score — April',
                data: weeklyAverages,
                borderColor: '#d4af37',
                backgroundColor: 'rgba(212, 175, 55, 0.2)',
                fill: true,
                tension: 0.35,
                pointBackgroundColor: '#d4af37',
                pointBorderColor: '#0f172a',
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: false, min: 40, max: 100 } },
            plugins: { legend: { display: true } }
        }
    });
}

function getTopicAverages() {
    if (!students.length) return [];
    const totals = {};
    students.forEach((student) => {
        Object.entries(student.topics).forEach(([topic, score]) => {
            if (!totals[topic]) totals[topic] = { sum: 0, count: 0 };
            totals[topic].sum += score;
            totals[topic].count += 1;
        });
    });

    return Object.entries(totals).map(([topic, data]) => ({
        topic,
        avgScore: Math.round(data.sum / data.count),
        strugglingPct: Math.round(
            (students.filter((s) => (s.topics[topic] || 0) < 60).length / students.length) * 100
        ),
        affectedStudents: students.filter((s) => (s.topics[topic] || 0) < 60).length
    }));
}

function getSeverityTag(avgScore) {
    if (avgScore < 45) return { label: 'Critical', className: 'tag-critical' };
    if (avgScore < 60) return { label: 'Moderate', className: 'tag-moderate' };
    return { label: 'Watch', className: 'tag-watch' };
}

function initWeaknessChart() {
    const weaknessCanvas = document.getElementById('weaknessChart');
    if (!weaknessCanvas) return;

    if (weaknessChartInstance) {
        weaknessChartInstance.destroy();
    }

    const topicAverages = getTopicAverages().sort((a, b) => b.strugglingPct - a.strugglingPct);

    weaknessChartInstance = new Chart(weaknessCanvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: topicAverages.map((t) => t.topic),
            datasets: [{
                label: '% Students Struggling',
                data: topicAverages.map((t) => t.strugglingPct),
                backgroundColor: 'rgba(212, 175, 55, 0.75)',
                borderColor: '#d4af37',
                borderWidth: 1,
                borderRadius: 8
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        color: '#cbd5e1',
                        callback(value) {
                            return `${value}%`;
                        }
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.08)' }
                },
                y: {
                    ticks: { color: '#f8fafc' },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                }
            },
            plugins: {
                legend: { labels: { color: '#f8fafc' } }
            }
        }
    });
}

function renderLearningGapsTable() {
    const tbody = document.getElementById('learningGapsTableBody');
    if (!tbody) return;

    const topicAverages = getTopicAverages().sort((a, b) => a.avgScore - b.avgScore);
    tbody.innerHTML = topicAverages.map((topic) => {
        const severity = getSeverityTag(topic.avgScore);
        return `
            <tr>
                <td><strong>${escapeHtml(topic.topic)}</strong></td>
                <td>Mathematics</td>
                <td>${topic.affectedStudents}</td>
                <td>${topic.avgScore}%</td>
                <td><span class="badge ${severity.className}">${severity.label}</span></td>
            </tr>
        `;
    }).join('');
}

function renderDashboardSection() {
    initChart();
    initTrendChart();
    renderRecentAlerts();
    renderNeedsAttention();
}

function renderWeaknessDetection() {
    initWeaknessChart();
    renderLearningGapsTable();
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
        tr.onclick = () => openStudentModal(student.id);
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

function openStudentModal(studentId) {
    openStudentDetail(studentId);
}

function closeStudentDetail() {
    document.getElementById('studentModal').classList.remove('active');
}

document.addEventListener('DOMContentLoaded', () => {
    const titleEl = document.querySelector('.dashboard-header h1');
    const subEl = document.querySelector('.dashboard-header .subtitle');
    if (titleEl && teacherData.name) titleEl.textContent = teacherData.name;
    if (subEl && teacherData.subject) subEl.textContent = teacherData.subject;
    if (teacherData.classes && teacherData.classes.length > 0) {
        selectClass(teacherData.classes[0]);
    }
});