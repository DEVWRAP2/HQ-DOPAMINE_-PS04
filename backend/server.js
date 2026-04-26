const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

// Enable CORS so the frontend can make requests to this backend
app.use(cors());

// Middleware to parse JSON bodies
app.use(express.json());

function transformStudentData(rawStudent) {
    const presentCount = rawStudent.attendance.filter(a => a.status === 'present').length;
    const totalCount = rawStudent.attendance.length || 1;
    const attendancePct = Math.round((presentCount / totalCount) * 100);

    const completedAssig = rawStudent.assignments.filter(a => a.completed).length;
    const totalAssig = rawStudent.assignments.length || 1;
    const effortLevel = (completedAssig / totalAssig) >= 0.8 ? 'high' : ((completedAssig / totalAssig) >= 0.5 ? 'medium' : 'low');

    const topicsMap = {};
    let totalScore = 0;
    rawStudent.scores.forEach(s => {
        if (!topicsMap[s.topic]) {
            topicsMap[s.topic] = { name: s.topic, score: s.marks, maxScore: 100, count: 1 };
        } else {
            topicsMap[s.topic].score += s.marks;
            topicsMap[s.topic].count += 1;
        }
        totalScore += s.marks;
    });

    const topics = Object.values(topicsMap).map(t => ({
        name: t.name,
        score: Math.round(t.score / t.count),
        maxScore: 100
    }));

    const overallScore = rawStudent.scores.length ? Math.round(totalScore / rawStudent.scores.length) : 0;
    const understandingLevel = overallScore > 70 ? 'good' : (overallScore > 50 ? 'average' : 'poor');
    const needHelpTopics = topics.filter(t => t.score < 60).map(t => t.name);

    return {
        id: rawStudent.id,
        name: rawStudent.name,
        email: rawStudent.email,
        rollNo: rawStudent.rollNo,
        class: rawStudent.class || 'Class 10-A',
        subject: rawStudent.scores[0]?.subject || 'Science',
        attendance: attendancePct,
        overallScore: overallScore,
        effortLevel: effortLevel,
        understandingLevel: understandingLevel,
        assignments: { completed: completedAssig, total: totalAssig },
        needHelpTopics: needHelpTopics,
        topics: topics,
        tests: [
            { name: "Recent Assessment", score: overallScore, topicsWeak: needHelpTopics }
        ]
    };
}

// Define the /login endpoint
app.post('/login', (req, res) => {
    const { email } = req.body;
    console.log(`Login attempt for email: ${email}`);

    const dataPath = path.join(__dirname, 'data', 'students.json');

    fs.readFile(dataPath, 'utf8', (err, data) => {
        if (err) {
            console.error("Error reading file:", err);
            return res.status(500).json({ success: false, message: "Internal server error" });
        }

        try {
            const students = JSON.parse(data);
            const student = students.find(s => s.email === email);

            if (student) {
                console.log(`Student found: ${student.name}`);
                res.json({ success: true, student: transformStudentData(student) });
            } else {
                console.log(`No account found for: ${email}`);
                res.json({ success: false, message: "No account found" });
            }
        } catch (parseErr) {
            console.error("Error parsing JSON:", parseErr);
            res.status(500).json({ success: false, message: "Internal server error" });
        }
    });
});

// Define the /students endpoint
app.get('/students', (req, res) => {
    // Read the students.json file
    const dataPath = path.join(__dirname, 'data', 'students.json');

    fs.readFile(dataPath, 'utf8', (err, data) => {
        if (err) {
            console.error("Error reading file:", err);
            return res.status(500).json({ error: "Failed to read data" });
        }

        try {
            // Parse the JSON data, transform it, and send it as the response
            const students = JSON.parse(data);
            const transformedStudents = students.map(transformStudentData);
            res.json(transformedStudents);
        } catch (parseErr) {
            console.error("Error parsing JSON:", parseErr);
            res.status(500).json({ error: "Internal server error" });
        }
    });
});

// Define the /student/:rollNo endpoint
app.get('/student/:rollNo', (req, res) => {
    const dataPath = path.join(__dirname, 'data', 'students.json');

    fs.readFile(dataPath, 'utf8', (err, data) => {
        if (err) {
            console.error("Error reading file:", err);
            return res.status(500).json({ error: "Internal server error" });
        }

        try {
            const students = JSON.parse(data);
            const student = students.find(s => s.rollNo === req.params.rollNo);

            if (student) {
                res.json(transformStudentData(student));
            } else {
                res.status(404).json({ error: "Not found" });
            }
        } catch (parseErr) {
            console.error("Error parsing JSON:", parseErr);
            res.status(500).json({ error: "Internal server error" });
        }
    });
});

// Start the server
// app.listen(PORT, () => {
//     console.log(`Server is running on http://localhost:${PORT}`);
//     console.log(`View students data at: http://localhost:${PORT}/students`);
// });

module.exports = app;
