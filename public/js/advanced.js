// Global variables
let teamData = null;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadAdvancedAnalytics();
});

// Load data
async function loadAdvancedAnalytics() {
    try {
        const response = await fetch('/api/employee-data');
        if (!response.ok) {
            throw new Error('Failed to fetch data');
        }
        teamData = await response.json();

        calculateTeamHealthScore();
        updateBenchmarking();
        calculateForecast();
        analyzeSleepDebt();
        generateRecommendations();
    } catch (error) {
        console.error('Error loading data:', error);
        showError('Помилка завантаження даних. Будь ласка, спробуйте пізніше.');
    }
}

// Calculate Team Health Score (0-100)
function calculateTeamHealthScore() {
    if (!teamData) return;

    const employees = teamData.employees;
    let totalScore = 0;

    employees.forEach(emp => {
        const m = emp.metrics;
        const who5Score = m.who5;
        const phq9Score = 100 - (m.phq9 / 27 * 100);
        const gad7Score = 100 - (m.gad7 / 21 * 100);
        const mbiScore = 100 - m.mbi;
        const sleepScore = (m.sleepDuration / 9) * 100;
        const qualityScore = (m.sleepQuality / 10) * 100;
        const balanceScore = (m.workLifeBalance / 10) * 100;
        const stressScore = 100 - (m.stressLevel / 40 * 100);

        const empScore = (who5Score + phq9Score + gad7Score + mbiScore + sleepScore + qualityScore + balanceScore + stressScore) / 8;
        totalScore += empScore;
    });

    const healthScore = Math.round(totalScore / employees.length);
    document.getElementById('healthScore').textContent = healthScore;

    let indicator = '';
    let colorClass = '';
    if (healthScore >= 70) {
        indicator = '🟢 Відмінно';
        colorClass = 'health-good';
    } else if (healthScore >= 50) {
        indicator = '🟡 Задовільно';
        colorClass = 'health-medium';
    } else {
        indicator = '🔴 Потребує уваги';
        colorClass = 'health-poor';
    }

    const scoreElement = document.querySelector('.health-score-value');
    scoreElement.className = 'health-score-value ' + colorClass;
    document.getElementById('healthIndicator').textContent = indicator;
}

// Update Benchmarking
function updateBenchmarking() {
    if (!teamData) return;

    const avg = teamData.teamAverages.current;
    const benchmarks = {
        who5: { your: avg.who5, industry: 62, higherIsBetter: true, max: 100 },
        phq9: { your: avg.phq9, industry: 6.8, higherIsBetter: false, max: 27 },
        gad7: { your: avg.gad7, industry: 7.5, higherIsBetter: false, max: 21 },
        mbi: { your: avg.mbi, industry: 42, higherIsBetter: false, max: 100 },
        stress: { your: avg.stressLevel, industry: 18, higherIsBetter: false, max: 40 }
    };

    Object.keys(benchmarks).forEach(key => {
        const data = benchmarks[key];
        const yourValue = data.your.toFixed(1);

        document.getElementById(key + 'YourValue').textContent = yourValue;

        const yourWidth = (data.your / data.max) * 100;
        const industryWidth = (data.industry / data.max) * 100;

        document.getElementById(key + 'Your').style.width = yourWidth + '%';
        document.getElementById(key + 'Industry').style.width = industryWidth + '%';

        let status = '';
        if (data.higherIsBetter) {
            if (data.your >= data.industry * 0.95) status = '✅ краще';
            else if (data.your >= data.industry * 0.85) status = '≈ середнє';
            else status = '📉 гірше';
        } else {
            if (data.your <= data.industry * 1.05) status = '✅ краще';
            else if (data.your <= data.industry * 1.15) status = '≈ середнє';
            else status = '📉 гірше';
        }

        document.getElementById(key + 'Status').textContent = status;
    });
}

// Calculate Forecast
function calculateForecast() {
    if (!teamData) return;

    const history = teamData.teamAverages;
    const metrics = [
        { key: 'who5', name: 'WHO-5 Благополуччя' },
        { key: 'phq9', name: 'PHQ-9 Депресія' },
        { key: 'mbi', name: 'MBI Вигорання' }
    ];

    const forecastGrid = document.getElementById('forecastGrid');
    forecastGrid.innerHTML = '';

    metrics.forEach(metric => {
        const oct = history.october[metric.key];
        const nov = history.november[metric.key];
        const trend = nov - oct;
        const forecast = nov + trend;

        const trendArrow = trend > 0 ? '📈' : trend < 0 ? '📉' : '➡️';
        const trendText = trend > 0 ? 'Зростання' : trend < 0 ? 'Зниження' : 'Стабільно';

        const card = document.createElement('div');
        card.className = 'forecast-card';

        card.innerHTML = '<h3>' + metric.name + '</h3>' +
            '<div class="forecast-value">' + forecast.toFixed(1) + '</div>' +
            '<div class="forecast-trend">' + trendArrow + ' ' + trendText + '</div>' +
            '<div class="forecast-change">Зміна: ' + (trend > 0 ? '+' : '') + trend.toFixed(1) + '</div>';

        forecastGrid.appendChild(card);
    });
}

// Analyze Sleep Debt
function analyzeSleepDebt() {
    if (!teamData) return;

    const employees = teamData.employees;
    const optimalSleep = 7.5;
    let totalDebt = 0;
    let atRisk = 0;

    const debtData = [];

    employees.forEach(emp => {
        const debt = Math.max(0, (optimalSleep - emp.metrics.sleepDuration) * 7);
        totalDebt += debt;
        if (emp.metrics.sleepDuration < 6.5) atRisk++;

        debtData.push({
            name: emp.name,
            debt: debt
        });
    });

    const avgDebt = totalDebt / employees.length;

    document.getElementById('totalSleepDebt').textContent = totalDebt.toFixed(0);
    document.getElementById('avgSleepDebt').textContent = avgDebt.toFixed(1);
    document.getElementById('atRiskCount').textContent = atRisk;

    const ctx = document.getElementById('sleepDebtChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: debtData.map(d => d.name.split(' ')[0]),
            datasets: [{
                label: 'Борг сну (год/тиждень)',
                data: debtData.map(d => d.debt),
                backgroundColor: debtData.map(d =>
                    d.debt > 10 ? 'rgba(239, 68, 68, 0.8)' :
                    d.debt > 5 ? 'rgba(251, 191, 36, 0.8)' :
                    'rgba(34, 197, 94, 0.8)'
                ),
                borderColor: debtData.map(d =>
                    d.debt > 10 ? '#ef4444' :
                    d.debt > 5 ? '#fbbf24' :
                    '#22c55e'
                ),
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    labels: {
                        color: '#e2e8f0'
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(99, 102, 241, 0.1)'
                    },
                    ticks: {
                        color: '#cbd5e1'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(99, 102, 241, 0.1)'
                    },
                    ticks: {
                        color: '#cbd5e1',
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            }
        }
    });
}

// Generate Recommendations
function generateRecommendations() {
    if (!teamData) return;

    const employees = teamData.employees;
    const recommendations = [];

    employees.forEach(emp => {
        const m = emp.metrics;
        const firstName = emp.name.split(' ')[0];

        if (m.phq9 > 10) {
            recommendations.push({
                employee: emp.name,
                category: '💚 Підтримка',
                message: 'Привіт ' + firstName + ',\n\nПомітив(ла), що останнім часом може бути важко. Нагадую, що у нас є безкоштовна конфіденційна підтримка психолога. Можна записатися анонімно через HR-портал.\n\nТи не один/одна - піклуємося про тебе! 💙',
                action: 'Запропонувати консультацію психолога'
            });
        }

        if (m.sleepDuration < 6) {
            recommendations.push({
                employee: emp.name,
                category: '😴 Сон',
                message: 'Привіт ' + firstName + '!\n\nПомітив(ла), що твій графік сну останнім часом скоротився. Якісний сон - основа продуктивності та здоров\'я.\n\nПропоную:\n- Спробуй встановити будильник на годину раніше лягання\n- Використовуй додаток для медитації (Calm/Headspace)\n- Якщо потрібно - можна обговорити гнучкий графік\n\nПодбаємо про це разом! 🌙',
                action: 'Обговорити режим дня та навантаження'
            });
        }

        if (m.workLifeBalance < 5) {
            recommendations.push({
                employee: emp.name,
                category: '⚖️ Баланс',
                message: 'Привіт ' + firstName + ',\n\nПомічаю, що робота забирає багато часу останнім часом. Важливо знаходити час для себе та близьких.\n\nДавай обговоримо:\n- Чи можна перерозподілити завдання?\n- Може потрібна допомога в команді?\n- Спробуй використати всі дні відпустки\n\nТи цінний член команди, і твоє благополуччя важливе! 🌟',
                action: 'Обговорити навантаження та приоритети'
            });
        }

        if (m.gad7 > 10) {
            recommendations.push({
                employee: emp.name,
                category: '💚 Підтримка',
                message: 'Привіт ' + firstName + ',\n\nЗверни увагу на техніки керування стресом:\n- Дихальні вправи 4-7-8\n- 5-хвилинні перерви кожні 90 хв\n- Прогулянки на свіжому повітрі\n\nЯкщо хочеш поговорити - завжди відкритий для розмови. Можемо також організувати консультацію з фахівцем.\n\nРазом впораємося! 💪',
                action: 'Запропонувати антистресові практики'
            });
        }

        if (m.workLifeBalance < 5 && m.stressLevel > 15) {
            recommendations.push({
                employee: emp.name,
                category: '⏰ Переробки',
                message: 'Привіт ' + firstName + ',\n\nПомічаю ознаки перевантаження. Важливо пам\'ятати:\n- Твоє здоров\'я важливіше дедлайнів\n- Переробки не роблять тебе продуктивнішим\n- Якість важливіша за кількість годин\n\nДавай знайдемо баланс разом. Готовий обговорити пріоритети?\n\nТвоє благополуччя - наш пріоритет! 🎯',
                action: 'Терміново обговорити робоче навантаження'
            });
        }
    });

    const grid = document.getElementById('recommendationsGrid');
    grid.innerHTML = '';

    if (recommendations.length === 0) {
        grid.innerHTML = '<p style="color: var(--text-tertiary); text-align: center; padding: 2rem;">Всі показники в нормі! 🎉</p>';
        return;
    }

    recommendations.forEach(rec => {
        const card = document.createElement('div');
        card.className = 'recommendation-card';
        
        const escapedMessage = rec.message.replace(/`/g, '\\`').replace(/\$/g, '\\$');
        
        card.innerHTML = '<div class="rec-header">' +
            '<span class="rec-category">' + rec.category + '</span>' +
            '<strong>' + rec.employee + '</strong>' +
            '</div>' +
            '<div class="rec-message">' + rec.message.replace(/\n/g, '<br>') + '</div>' +
            '<div class="rec-actions">' +
            '<button class="copy-btn" onclick="copyToClipboard(`' + escapedMessage + '`)">📱 Копіювати для Telegram</button>' +
            '<span class="rec-action">' + rec.action + '</span>' +
            '</div>';
        
        grid.appendChild(card);
    });
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('Текст скопійовано в буфер обміну!');
    }).catch(err => {
        console.error('Failed to copy:', err);
        alert('Помилка копіювання. Спробуйте ще раз.');
    });
}

function handleLogout() {
    if (confirm('Ви впевнені, що хочете вийти?')) {
        window.location.href = '/';
    }
}

function showError(message) {
    const container = document.querySelector('.container');
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.3); color: #fca5a5; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; text-align: center;';
    errorDiv.textContent = message;
    container.insertBefore(errorDiv, container.firstChild);
}
