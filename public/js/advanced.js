// Global variables
let teamData = null;
let charts = {};
const MONTH_LABELS = {
    august: 'Серп',
    september: 'Вер',
    october: 'Жовт',
    november: 'Лист',
    december: 'Груд',
    january: 'Січ',
    february: 'Лют',
    march: 'Бер',
    april: 'Квіт',
    may: 'Трав',
    june: 'Черв',
    july: 'Лип'
};
const METRIC_HINTS = {
    who5: 'WHO-5: 0-100, <50 — ризик низького благополуччя',
    phq9: 'PHQ-9: 0-27, >10 — помірна/висока депресивна симптоматика',
    gad7: 'GAD-7: 0-21, >10 — помірна/висока тривожність',
    mbi: 'MBI: 0-100%, >40% — підвищений ризик вигорання',
    stress: 'Суб\'єктивний стрес: 0-40, >20 — підвищений',
    sleep: 'Тривалість сну: ціль 7-9 год',
    sleepQuality: 'Якість сну: 1-10, <6 — погіршення',
    workLifeBalance: 'Баланс: 1-10, <6 — дисбаланс',
    forecast: 'Прогноз базується на останніх двох місяцях'
};

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
        renderTrajectoryChart();
        renderRiskBubbleChart();
        calculateForecast();
        analyzeSleepDebt();
        renderEmployeeInsights();
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

    const avg = getLatestAverage();
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

// Trajectory chart (WHO-5, stress, sleep)
function renderTrajectoryChart() {
    if (!teamData) return;

    const ctxEl = document.getElementById('trajectoryChart');
    if (!ctxEl) return;

    const months = getRecentMonths(4);
    const averages = teamData.teamAverages;
    const labels = months.map(labelFromKey);

    const who5 = months.map(m => averages[m]?.who5 ?? 0);
    const stressRaw = months.map(m => averages[m]?.stressLevel ?? 0);
    const stress = stressRaw.map(v => (v / 40) * 100);
    const sleepRaw = months.map(m => averages[m]?.sleepDuration ?? 0);
    const sleep = sleepRaw.map(v => (v / 9) * 100);

    if (charts.trajectory) charts.trajectory.destroy();

    const ctx = ctxEl.getContext('2d');

    charts.trajectory = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'WHO-5',
                    data: who5,
                    borderColor: '#a5b4fc',
                    backgroundColor: 'rgba(99, 102, 241, 0.15)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 3
                },
                {
                    label: 'Стрес (0-40 → 0-100)',
                    data: stress,
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.08)',
                    fill: true,
                    tension: 0.35,
                    borderWidth: 2,
                    borderDash: [6, 6]
                },
                {
                    label: 'Сон (год → 0-100)',
                    data: sleep,
                    borderColor: '#22c55e',
                    backgroundColor: 'rgba(34, 197, 94, 0.12)',
                    fill: true,
                    tension: 0.35,
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#e2e8f0' }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const idx = context.dataIndex;
                            if (context.dataset.label.includes('WHO-5')) {
                                return 'WHO-5: ' + who5[idx] + ' (' + METRIC_HINTS.who5 + ')';
                            }
                            if (context.dataset.label.includes('Стрес')) {
                                return 'Стрес: ' + stressRaw[idx] + ' / 40 (' + METRIC_HINTS.stress + ')';
                            }
                            return 'Сон: ' + sleepRaw[idx] + ' год (' + METRIC_HINTS.sleep + ')';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    suggestedMax: 100,
                    grid: { color: 'rgba(99, 102, 241, 0.1)' },
                    ticks: { color: '#cbd5e1' }
                },
                x: {
                    grid: { color: 'rgba(99, 102, 241, 0.1)' },
                    ticks: { color: '#cbd5e1' }
                }
            }
        }
    });

    const latestKey = getLatestMonthKey();
    const prevKey = getPrevMonthKey();
    const latestIdx = months.indexOf(latestKey);
    const prevIdx = Math.max(0, latestIdx - 1);
    const whoDelta = who5[latestIdx] - who5[prevIdx];
    const stressDelta = stressRaw[latestIdx] - stressRaw[prevIdx];
    const sleepDelta = sleepRaw[latestIdx] - sleepRaw[prevIdx];

    updateText('trajectoryComment', `Останній місяць (${labelFromKey(latestKey)}): WHO-5 ${who5[latestIdx].toFixed(1)}, сон ${sleepRaw[latestIdx].toFixed(1)} год, стрес ${stressRaw[latestIdx].toFixed(1)}/40. Δ vs ${labelFromKey(prevKey)}: WHO-5 ${(whoDelta>=0?'+':'') + whoDelta.toFixed(1)}, сон ${(sleepDelta>=0?'+':'') + sleepDelta.toFixed(1)} год, стрес ${(stressDelta>=0?'+':'') + stressDelta.toFixed(1)}.`);

    const modalMetrics = [
        { key: 'who5', label: 'WHO-5', value: who5[latestIdx].toFixed(1) + ` (${deltaText(whoDelta)})` },
        { key: 'sleep', label: 'Сон (год)', value: sleepRaw[latestIdx].toFixed(1) + ` (${deltaText(sleepDelta)})` },
        { key: 'stress', label: 'Стрес (0-40)', value: stressRaw[latestIdx].toFixed(1) + ` (${deltaText(stressDelta)})` }
    ];
    fillMetricsGrid('trajectoryMetrics', modalMetrics);
    updateText('trajectorySummary', `Фокус: за останній місяць ${labelFromKey(latestKey)} змінились головні показники настрою, сну та стресу. Це базовий барометр команди на останню хвилю вимірювань.`);
}

// Stress vs burnout matrix
function renderRiskBubbleChart() {
    if (!teamData) return;

    const ctxEl = document.getElementById('riskBubbleChart');
    if (!ctxEl) return;

    if (charts.riskBubble) charts.riskBubble.destroy();

    const ctx = ctxEl.getContext('2d');
    const colors = {
        high: { fill: 'rgba(239, 68, 68, 0.65)', border: '#ef4444' },
        medium: { fill: 'rgba(251, 191, 36, 0.55)', border: '#f59e0b' },
        low: { fill: 'rgba(34, 197, 94, 0.55)', border: '#22c55e' },
        positive: { fill: 'rgba(139, 92, 246, 0.55)', border: '#8b5cf6' }
    };

    const points = teamData.employees.map(emp => ({
        x: emp.metrics.stressLevel,
        y: emp.metrics.mbi,
        r: Math.max(8, emp.metrics.phq9 + 4),
        name: emp.name,
        risk: emp.riskLevel || 'medium'
    }));

    charts.riskBubble = new Chart(ctx, {
        type: 'bubble',
        data: {
            datasets: [{
                label: 'Ризики',
                data: points,
                backgroundColor: points.map(p => (colors[p.risk]?.fill || colors.medium.fill)),
                borderColor: points.map(p => (colors[p.risk]?.border || colors.medium.border)),
                borderWidth: 2,
                hoverBorderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const raw = context.raw;
                            return [
                                raw.name,
                                'Стрес: ' + raw.x + '/40',
                                'MBI: ' + raw.y.toFixed(1) + '%',
                                'PHQ-9: ' + (raw.r - 4)
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Рівень стресу (PSS) →',
                        color: '#cbd5e1',
                        font: { size: 14, weight: 'bold' }
                    },
                    beginAtZero: true,
                    max: 40,
                    grid: { color: 'rgba(99, 102, 241, 0.1)' },
                    ticks: { color: '#cbd5e1' }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Індекс вигорання (MBI %) ↑',
                        color: '#cbd5e1',
                        font: { size: 14, weight: 'bold' }
                    },
                    beginAtZero: true,
                    max: 100,
                    grid: { color: 'rgba(99, 102, 241, 0.1)' },
                    ticks: { color: '#cbd5e1' }
                }
            },
            animation: { duration: 900, easing: 'easeOutQuart' }
        }
    });

    const counts = points.reduce((acc, p) => {
        acc[p.risk] = (acc[p.risk] || 0) + 1;
        return acc;
    }, {});
    const topRisk = points.slice().sort((a, b) => (b.y + b.x) - (a.y + a.x))[0];
    updateText('riskComment', `Ризики: high ${counts.high || 0}, medium ${counts.medium || 0}, low ${counts.low || 0}. Найвищий ризик: ${topRisk?.name || '—'}.`);

    const modalMetrics = [
        { key: 'mbi', label: 'High', value: counts.high || 0 },
        { key: 'mbi', label: 'Medium', value: counts.medium || 0 },
        { key: 'mbi', label: 'Low', value: counts.low || 0 },
        { key: 'mbi', label: 'Найвищий ризик', value: topRisk ? `${topRisk.name} · MBI ${topRisk.y.toFixed(0)}%, стрес ${topRisk.x}/40` : '—' }
    ];
    fillMetricsGrid('riskMetrics', modalMetrics);
    updateText('riskSummary', 'Матриця поєднує стрес, вигорання та PHQ-9 як радіус, щоб за секунди визначити, кого брати на 1:1 першими.');
}

// Calculate Forecast
function calculateForecast() {
    if (!teamData) return;

    const history = teamData.teamAverages;
    const monthKeys = getMonthKeys();
    const latestKey = getLatestMonthKey();
    const prevKey = getPrevMonthKey();
    const metrics = [
        { key: 'who5', name: 'WHO-5 Благополуччя', tooltip: 'WHO-5: 0-100, <50 — ризик зниження благополуччя' },
        { key: 'phq9', name: 'PHQ-9 Депресія', tooltip: 'PHQ-9: 0-27, >10 — середня депресивна симптоматика' },
        { key: 'mbi', name: 'MBI Вигорання', tooltip: 'MBI: 0-100%, >40% — високий ризик вигорання' }
    ];

    const forecastGrid = document.getElementById('forecastGrid');
    forecastGrid.innerHTML = '';

    metrics.forEach(metric => {
        const prev = history[prevKey]?.[metric.key] ?? history[latestKey]?.[metric.key];
        const curr = history[latestKey]?.[metric.key] ?? prev;
        const trend = curr - prev;
        const forecast = curr + trend;

        const trendArrow = trend > 0 ? '📈' : trend < 0 ? '📉' : '➡️';
        const trendText = trend > 0 ? 'Зростання' : trend < 0 ? 'Зниження' : 'Стабільно';

        const card = document.createElement('div');
        card.className = 'forecast-card';

        card.innerHTML = '<h3 title="' + metric.tooltip + '">' + metric.name + '</h3>' +
            '<div class="forecast-value">' + forecast.toFixed(1) + '</div>' +
            '<div class="forecast-trend">' + trendArrow + ' ' + trendText + ' (' + labelFromKey(prevKey) + '→' + labelFromKey(latestKey) + ')</div>' +
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
    if (charts.sleepDebt) charts.sleepDebt.destroy();

    charts.sleepDebt = new Chart(ctx, {
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
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: {
                    labels: {
                        color: '#e2e8f0'
                    }
                }
            },
            scales: {
                y: {
                    grid: {
                        color: 'rgba(99, 102, 241, 0.1)'
                    },
                    ticks: {
                        color: '#cbd5e1'
                    }
                },
                x: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(99, 102, 241, 0.1)'
                    },
                    ticks: {
                        color: '#cbd5e1'
                    }
                }
            }
        }
    });
}

// Deep employee insights
function renderEmployeeInsights() {
    if (!teamData) return;

    const grid = document.getElementById('insightGrid');
    if (!grid) return;

    const employees = teamData.employees;

    const riskSorted = [...employees].sort((a, b) =>
        (b.metrics.mbi + b.metrics.phq9) - (a.metrics.mbi + a.metrics.phq9)
    );
    const topRiskNames = riskSorted.slice(0, 2).map(e =>
        `${e.name.split(' ')[0]} (MBI ${e.metrics.mbi.toFixed(0)}%, PHQ-9 ${e.metrics.phq9})`
    ).join(', ');

    const improvements = employees.map(emp => {
        const oct = emp.history?.october?.who5 ?? emp.metrics.who5;
        const nov = emp.history?.november?.who5 ?? emp.metrics.who5;
        return { name: emp.name, delta: nov - oct };
    }).sort((a, b) => b.delta - a.delta);

    const topRecovery = improvements.filter(i => i.delta > 0).slice(0, 2)
        .map(i => `${i.name.split(' ')[0]} (+${i.delta.toFixed(0)} WHO-5)`).join(', ');

    const declines = improvements.filter(i => i.delta < 0).slice(0, 2)
        .map(i => `${i.name.split(' ')[0]} (${i.delta.toFixed(0)})`).join(', ');

    const sleepDebt = employees.map(emp => {
        const debt = Math.max(0, (7.5 - emp.metrics.sleepDuration) * 7);
        return { name: emp.name, debt };
    }).sort((a, b) => b.debt - a.debt).slice(0, 2);

    const balanced = [...employees].sort((a, b) =>
        b.metrics.workLifeBalance - a.metrics.workLifeBalance
    ).slice(0, 2);

    const cards = [
        {
            pill: 'CRITICAL',
            title: 'Терміновий фокус 1:1',
            body: topRiskNames || 'Немає червоних прапорців цього тижня.',
            bullets: [
                topRiskNames ? 'Фокус на працівниках з найвищим MBI/PHQ-9.' : 'Команда без червоних тригерів.',
                'Уточнити, чи є інші ранні симптоми (сон <6.5 год, PHQ-9>10).'
            ],
            plan: 'Олег планує: провести короткі 12-хв check-in з найризиковішими, нотувати 2 блокери та підтвердити підтримку психолога/коуча з фіксацією follow-up через 7 днів.'
        },
        {
            pill: 'RECOVERY',
            title: 'Найбільше відновлення',
            body: topRecovery || 'Динаміка стабільна, різких підйомів не зафіксовано.',
            bullets: [
                topRecovery ? 'Є чіткі історії відновлення — потенційні best practices.' : 'Без стрибків зростання — моніторити стабільність.',
                'Важливо зафіксувати, що саме спрацювало.'
            ],
            plan: topRecovery
                ? 'Олег планує: провести 15-хв peer sharing з цими людьми, записати 2-3 ритуали та поширити в команді.'
                : 'Олег планує: залишити короткі 1:1 раз на 2 тижні для відстеження настрою.'
        },
        {
            pill: 'DROP',
            title: 'Негативна динаміка',
            body: declines || 'Немає різких спадів за місяць.',
            bullets: [
                declines ? 'Є падіння WHO-5 — потенційні локальні проблеми.' : 'Без суттєвих спадів — тримати моніторинг.',
                'Ймовірні причини: пікове навантаження чи недосип.'
            ],
            plan: 'Олег планує: перевірити пріоритети, запропонувати buddy з еталонного балансу та закріпити одну зміну в календарі (менше мітингів/гнучкий старт).'
        },
        {
            pill: 'SLEEP',
            title: 'Борг сну та енергія',
            body: sleepDebt.length
                ? sleepDebt.map(d => `${d.name.split(' ')[0]} (+${d.debt.toFixed(0)} год/тижд)`).join(', ')
                : 'Борг сну в нормі.',
            bullets: [
                sleepDebt.length ? 'Є помітний борг сну — ризик падіння продуктивності.' : 'Сон стабільний — можна підтримувати режим.',
                'Недосип корелює з вигоранням і PHQ-9.'
            ],
            plan: 'Олег планує: підтвердити правило «без пінгів після 19:00», дати гнучкий старт дня та 2 дні з пізнішим стендапом для групи ризику.'
        },
        {
            pill: 'BALANCE',
            title: 'Еталонний баланс',
            body: balanced.map(b =>
                `${b.name.split(' ')[0]} (баланс ${b.metrics.workLifeBalance}/10, стрес ${b.metrics.stressLevel}/40)`
            ).join(', '),
            bullets: [
                'Є еталонні практики work-life balance у команді.',
                'Ці люди можуть бути buddy/менторами для групи ризику.'
            ],
            plan: 'Олег планує: запросити їх як buddy для ризикових колег та задокументувати їхні ритуали у внутрішньому гайді.'
        }
    ];

    grid.innerHTML = '';
    cards.forEach(card => {
        const el = document.createElement('div');
        el.className = 'insight-card lift';
        el.innerHTML = `
            <span class="insight-pill">★ ${card.pill}</span>
            <div class="insight-title">${card.title}</div>
            <div class="insight-body">${card.body}</div>
            <ul class="insight-list">${(card.bullets || []).map(b => `<li>${b}</li>`).join('')}</ul>
            <div class="insight-plan">${card.plan}</div>
        `;
        grid.appendChild(el);
    });
}

// Generate Recommendations
function generateRecommendations() {
    if (!teamData) return;

    const employees = teamData.employees;
    const plans = employees.map(buildRecommendationPlan).filter(Boolean);

    const grid = document.getElementById('recommendationsGrid');
    grid.innerHTML = '';

    if (plans.length === 0) {
        grid.innerHTML = '<p style="color: var(--text-tertiary); text-align: center; padding: 2rem;">Всі показники в нормі! 🎉</p>';
        return;
    }

    plans.forEach(plan => {
        const kitId = 'call-kit-' + plan.id;
        const card = document.createElement('div');
        card.className = 'recommendation-card lift';

        card.innerHTML = `
            <div class="rec-header">
                <div>
                    <span class="rec-category">${plan.category}</span>
                    <div class="rec-insight">${plan.subtitle}</div>
                </div>
                <strong>${plan.employee}</strong>
            </div>
            <div class="rec-message">${plan.message}</div>
            <div class="rec-actions">
                <button class="copy-btn" onclick="toggleCallKit('${kitId}')">План 1:1 (${plan.duration} хв)</button>
                <span class="rec-action">${plan.action}</span>
            </div>
            <div class="call-kit" id="${kitId}">
                ${plan.callKit}
            </div>
        `;

        grid.appendChild(card);
    });
}

function buildRecommendationPlan(emp) {
    const m = emp.metrics;
    const focusAreas = [];

    if (m.phq9 > 10 || m.gad7 > 10) focusAreas.push('mood');
    if (m.mbi > 35 || m.stressLevel > 17) focusAreas.push('burnout');
    if (m.sleepDuration < 6.5 || m.sleepQuality < 6) focusAreas.push('sleep');
    if (m.workLifeBalance < 6) focusAreas.push('load');

    const who5Delta = (emp.history?.november?.who5 ?? m.who5) - (emp.history?.october?.who5 ?? m.who5);
    if (who5Delta >= 15) focusAreas.push('recovery');

    if (focusAreas.length === 0) return null;

    const severity = focusAreas.some(a => a === 'burnout' || a === 'mood') ? 'risk'
        : focusAreas.includes('recovery') && focusAreas.length === 1 ? 'positive'
        : 'focus';

    const category = severity === 'risk' ? '🚨 Ризик 1:1'
        : severity === 'positive' ? '🌟 Масштабувати успіх'
        : '🛠 Профілактика';

    const triggers = [];
    if (focusAreas.includes('burnout')) triggers.push(`MBI ${m.mbi.toFixed(0)}% + стрес ${m.stressLevel}/40`);
    if (focusAreas.includes('mood')) triggers.push(`PHQ-9 ${m.phq9}/27, GAD-7 ${m.gad7}/21`);
    if (focusAreas.includes('sleep')) triggers.push(`сон ${m.sleepDuration} год, якість ${m.sleepQuality}/10`);
    if (focusAreas.includes('load')) triggers.push(`баланс ${m.workLifeBalance}/10`);
    if (focusAreas.includes('recovery')) triggers.push(`відновлення WHO-5 +${who5Delta.toFixed(0)}`);

    const message = `
        <div class="rec-insight">Тригери: ${triggers.join(' · ')}</div>
        <div>Фокус 1:1: ${focusAreas.includes('recovery') ? 'закріпити успіх і масштабувати на інших' : 'прибрати джерела стресу, відновити сон та баланс'}</div>
    `.trim();

    const action = severity === 'risk'
        ? 'Признач 1:1 протягом 48 годин та зафіксуй 2 зміни'
        : 'Провести 1:1 цього тижня з чітким 7-денним планом';

    return {
        id: emp.id,
        employee: emp.name,
        category,
        subtitle: `Стрес ${m.stressLevel}/40 · Сон ${m.sleepDuration.toFixed(1)} год · Баланс ${m.workLifeBalance}/10`,
        message,
        action,
        duration: severity === 'risk' ? 15 : 12,
        callKit: buildCallKit(emp, focusAreas, who5Delta)
    };
}

function buildCallKit(emp, focusAreas, who5Delta) {
    const firstName = emp.name.split(' ')[0];
    const m = emp.metrics;

    const questions = [
        'Як ти зараз по шкалі 0-10?',
        'Що забирає найбільше енергії цього тижня?',
        'Що можемо прибрати/делегувати вже зараз?',
        'Яка одна звичка допоможе відновитись цього тижня?'
    ];

    if (focusAreas.includes('sleep')) questions.push('Що заважає лягати раніше? Як команда може це підтримати?');
    if (focusAreas.includes('load')) questions.push('Які задачі вигоряють найбільше і не дають цінності?');
    if (focusAreas.includes('recovery') && who5Delta > 0) questions.push(`Що дало +${who5Delta.toFixed(0)} до WHO-5? Як це повторити?`);

    const uniqueQuestions = [...new Set(questions)];

    const microActions = [];
    if (focusAreas.includes('burnout')) microActions.push('Вилучити 1 не-критичний мітинг і додати 2х2 год фокусу без пінгів.');
    if (focusAreas.includes('mood')) microActions.push('Запропонувати консультацію психолога/коуча з конкретним слотом у календарі.');
    if (focusAreas.includes('sleep')) microActions.push('2 вечори без робочих чатів після 19:00 + пізній стендап 1 раз на тиждень.');
    if (focusAreas.includes('load')) microActions.push('Перерозподілити 1 задачку на колегу та заморозити 1 low-prio до наступного спринту.');
    if (focusAreas.includes('recovery')) microActions.push('Задокументувати практику, яка спрацювала, і поділитись на тім-міті (5 хв).');

    const blockers = [];
    if (focusAreas.includes('burnout')) blockers.push('емоційне виснаження');
    if (focusAreas.includes('sleep')) blockers.push('недосип');
    if (focusAreas.includes('load')) blockers.push('дисбаланс навантаження');
    if (!blockers.length && focusAreas.includes('recovery')) blockers.push('закріплення прогресу');

    return `
        <h4>Флоу 1:1 для ${firstName}</h4>
        <div class="rec-insight">Фокус: ${blockers.join(' • ')}</div>
        <div class="call-kit-grid">
            <div class="call-block"><strong>12-15 хв</strong>
                <ul>
                    <li>1 хв: нормалізуй і запроси чесність.</li>
                    <li>3 хв: відзеркаль дані (стрес ${m.stressLevel}/40, MBI ${m.mbi.toFixed(0)}%, сон ${m.sleepDuration} год).</li>
                    <li>5 хв: досліджуй корінь проблеми питаннями.</li>
                    <li>3-4 хв: разом оберіть 1-2 зміни на тиждень.</li>
                    <li>1 хв: зафіксуй наступний чекпойнт у календарі.</li>
                </ul>
            </div>
            <div class="call-block"><strong>Питання</strong>
                <ul>${uniqueQuestions.map(q => '<li>' + q + '</li>').join('')}</ul>
            </div>
            <div class="call-block"><strong>Домовленості</strong>
                <ul>
                    <li>Записати рішення прямо під час дзвінка.</li>
                    <li>Follow-up через 7 днів з конкретною метрикою (сон, стрес або WHO-5).</li>
                    <li>Buddy/коуч: визначити контакт і час.</li>
                </ul>
            </div>
        </div>
        <div class="micro-actions"><strong>Мікродії на 7 днів:</strong> ${microActions.join(' • ') || 'Залишаємо стабільний режим; відстежуємо сон та настрій.'}</div>
    `;
}

function toggleCallKit(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('open');
}

function openChartModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'flex';
}

function closeChartModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'none';
}

function modalBgClick(event, id) {
    if (event.target.id === id) {
        closeChartModal(id);
    }
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

// Helpers
function getMonthKeys() {
    return Object.keys(teamData.teamAverages).filter(k => k !== 'current');
}

function getLatestMonthKey() {
    const months = getMonthKeys();
    return months[months.length - 1];
}

function getPrevMonthKey() {
    const months = getMonthKeys();
    return months[Math.max(0, months.length - 2)];
}

function getRecentMonths(limit) {
    const months = getMonthKeys();
    return months.slice(Math.max(0, months.length - limit));
}

function labelFromKey(key) {
    return MONTH_LABELS[key] || key;
}

function updateText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function fillMetricsGrid(id, metrics) {
    const grid = document.getElementById(id);
    if (!grid) return;
    grid.innerHTML = metrics.map(item =>
        `<div class="modal-metric"><span class="metric-label" title="${METRIC_HINTS[item.key] || ''}">${item.label}</span><span class="metric-value">${item.value}</span></div>`
    ).join('');
}

function deltaText(value) {
    const prefix = value > 0 ? '+' : '';
    return `${prefix}${value.toFixed(1)}`;
}

function getLatestAverage() {
    const latestKey = getLatestMonthKey();
    return teamData.teamAverages[latestKey] || teamData.teamAverages.current;
}
