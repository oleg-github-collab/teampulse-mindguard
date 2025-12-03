const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.static('public'));

// API Routes
app.get('/api/team-data', (req, res) => {
  const teamData = require('./data/team-data.json');

  // Transform data to match dashboard expectations
  const monthMap = {
    'august': 8,
    'september': 9,
    'october': 10,
    'november': 11
  };

  const months = ['august', 'september', 'october', 'november'].map(monthKey => {
    const monthNum = monthMap[monthKey];
    const averages = teamData.teamAverages[monthKey];

    // Get employee data for this month
    const employees = teamData.employees.map(emp => {
      const monthData = emp.history[monthKey];
      return {
        name: emp.name,
        who5: monthData.who5,
        phq9: monthData.phq9,
        gad7: monthData.gad7,
        mbi: monthData.mbi,
        sleepDuration: monthData.sleepDuration,
        sleepQuality: monthData.sleepQuality,
        workLifeBalance: monthData.workLifeBalance,
        stressLevel: monthData.stressLevel
      };
    });

    return {
      month: monthNum,
      averages: {
        who5: averages.who5,
        phq9: averages.phq9,
        gad7: averages.gad7,
        mbi: averages.mbi,
        sleepDuration: averages.sleepDuration,
        sleepQuality: averages.sleepQuality,
        workLifeBalance: averages.workLifeBalance,
        stressLevel: averages.stressLevel
      },
      employees: employees
    };
  });

  res.json({ months });
});

app.get('/api/metrics', (req, res) => {
  const teamData = require('./data/team-data.json');
  const metrics = calculateMetrics(teamData);
  res.json(metrics);
});

app.get('/api/employee-data', (req, res) => {
  const teamData = require('./data/team-data.json');
  res.json(teamData);
});

// Calculate team metrics
function calculateMetrics(data) {
  const employees = data.employees;

  return {
    wellbeingIndex: average(employees.map(e => e.metrics.who5)),
    depressionLevel: average(employees.map(e => e.metrics.phq9)),
    anxietyLevel: average(employees.map(e => e.metrics.gad7)),
    burnoutIndex: average(employees.map(e => e.metrics.mbi)),
    sleepDuration: average(employees.map(e => e.metrics.sleepDuration)),
    sleepQuality: average(employees.map(e => e.metrics.sleepQuality)),
    workLifeBalance: average(employees.map(e => e.metrics.workLifeBalance)),
    stressLevel: average(employees.map(e => e.metrics.stressLevel)),
    atRiskCount: employees.filter(e => isAtRisk(e)).length,
    criticalCount: employees.filter(e => isCritical(e)).length
  };
}

function average(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function isAtRisk(employee) {
  return employee.metrics.who5 < 50 ||
         employee.metrics.phq9 > 10 ||
         employee.metrics.gad7 > 10 ||
         employee.metrics.mbi > 35;
}

function isCritical(employee) {
  return employee.metrics.who5 < 28 ||
         employee.metrics.phq9 > 15 ||
         employee.metrics.gad7 > 15;
}

// Serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 TeamPulse Mindguard AI server running on http://localhost:${PORT}`);
});
