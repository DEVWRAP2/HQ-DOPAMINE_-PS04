const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Enable CORS so the frontend can make requests to this backend
app.use(cors());

// Middleware to parse JSON bodies
app.use(express.json());

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
                res.json({ success: true, student });
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
        
        // Parse the JSON data and send it as the response
        res.json(JSON.parse(data));
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`View students data at: http://localhost:${PORT}/students`);
});
