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

// ════════════════════════════════
// LOAD DATA FROM JSON
// ════════════════════════════════
if (teacherData.subject) {
    fetch(API_BASE + '/students-by-subject/' + teacherData.subject)
        .then(res => res.json())
        .then(data => {
            rawStudentsData = data;
            console.log('Fetched subject-specific data from backend:', data);
            
            students = mapClassData(data);
            
            if (typeof renderDashboardSection === 'function') renderDashboardSection();
            if (typeof renderWeaknessDetection === 'function') renderWeaknessDetection();
            if (typeof populateTable === 'function') populateTable();
            
            if (typeof selectClass === 'function') {
                const firstClass = teacherData.classes && teacherData.classes.length > 0 ? teacherData.classes[0] : '10-A';
                selectClass(firstClass, 'dashboard');
            }
        })
        .catch(err => {
            console.error('Failed to load student data from backend:', err);
        });
}

function mapClassData(classData) {
    return classData.map(s => ({
        id: s.rollNo,
        name: s.name,
        className: s.class || 'Class 10-A',
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
}

// ════════════════════════════════
// CLASS DATA FILTERING
// ════════════════════════════════
async function openClass(className, classType) {
    if (teacherData.classes && !teacherData.classes.includes(classType)) {
        console.warn('Teacher does not have access to ' + classType);
        return; // Only show classes that are in teacherData.classes array
    }

    const titleEl = document.querySelector('.dashboard-header h1');
    const subEl = document.querySelector('.dashboard-header .subtitle');
    if (titleEl) titleEl.innerText = teacherData.name ? `Teacher Dashboard - ${teacherData.name}` : 'Teacher Dashboard';
    if (subEl) subEl.innerText = `${teacherData.subject || 'Subject'} · ${className}`;

    try {
        const res = await fetch(API_BASE + '/students-by-class/' + classType);
        const classData = await res.json();
        
        const subjectMap = {
            "Mathematics": "Math",
            "Chemistry": "Chemistry",
            "Physics": "Physics"
        };
        const mappedSubject = subjectMap[teacherData.subject] || teacherData.subject;

        const filteredData = classData.filter(s => s.subject === mappedSubject);

        students = mapClassData(filteredData);
        
        currentClassLabel = students[0]?.className || 'Class ' + classType;
        window.currentClassId = classType;

        renderDashboardSection();
        renderWeaknessDetection();
        populateTable();
    } catch (err) {
        console.error('Failed to fetch class data:', err);
    }
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

function buildNotifications() {
    const alerts = [];
    const lowScore = students.filter((s) => s.overallScore < 60).length;
    if (lowScore > 0) {
        alerts.push({
            type: 'warning',
            title: 'Low score alert',
            detail: `${lowScore} students are currently below 60% overall score.`
        });
    }

    const highRisk = students.filter((s) => s.overallScore < 50 && s.attendance < 70).length;
    if (highRisk > 0) {
        alerts.push({
            type: 'danger',
            title: 'At-risk students',
            detail: `${highRisk} students have both low score and low attendance.`
        });
    }

    const topPerformer = [...students].sort((a, b) => b.overallScore - a.overallScore)[0];
    if (topPerformer) {
        alerts.push({
            type: 'info',
            title: 'Top performer update',
            detail: `${topPerformer.name} is leading the class at ${topPerformer.overallScore}%.`
        });
    }

    const calcWeakCount = students.filter((s) => (s.topics.Calculus || 0) < 60).length;
    if (calcWeakCount > 0) {
        alerts.push({
            type: 'warning',
            title: 'Calculus weakness',
            detail: `${calcWeakCount} students are struggling in Calculus.`
        });
    }

    return alerts.slice(0, 3);
}

function renderRecentAlerts() {
    const list = document.getElementById('recentAlertsList');
    if (!list) return;
    const notifications = buildNotifications();
    list.innerHTML = notifications.map((n) => `
        <div class="recent-alert-item ${n.type}">
            <div>
                <h4>${escapeHtml(n.title)}</h4>
                <p>${escapeHtml(n.detail)}</p>
            </div>
        </div>
    `).join('');
}

function renderNeedsAttention() {
    const tbody = document.getElementById('needsAttentionTableBody');
    if (!tbody) return;

    const needsAttention = students
        .filter((s) => s.overallScore < 60)
        .sort((a, b) => a.overallScore - b.overallScore);

    tbody.innerHTML = needsAttention.map((student) => {
        const trendIcon = getTrendIcon(student);
        const gapTopic = student.needHelpTopics[0] || Object.entries(student.topics)
            .sort((a, b) => a[1] - b[1])[0]?.[0] || 'General Review';
        return `
            <tr onclick="openStudentModal('${student.id}')">
                <td><strong>${escapeHtml(student.name)}</strong></td>
                <td>${escapeHtml(student.className)}</td>
                <td>${student.overallScore}%</td>
                <td class="${getTrendClass(trendIcon)}">${trendIcon}</td>
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

    const topicNames = Object.keys(students[0]?.topics || {});
    const topicAverages = topicNames.map(topic => {
        const total = students.reduce((sum, s) => sum + (s.topics[topic] || 0), 0);
        return students.length ? Math.round(total / students.length) : 0;
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

    if (trendChartInstance) {
        trendChartInstance.destroy();
    }

    trendChartInstance = new Chart(trendCanvas.getContext('2d'), {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr'],
            datasets: [{
                label: 'Class Average %',
                data: [65, 68, 62, 74],
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
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: { color: '#cbd5e1' },
                    grid: { color: 'rgba(255, 255, 255, 0.08)' }
                },
                x: {
                    ticks: { color: '#cbd5e1' },
                    grid: { color: 'rgba(255, 255, 255, 0.06)' }
                }
            },
            plugins: { legend: { labels: { color: '#f8fafc' } } }
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
    // Data loads via fetch above, chart and table render after
});