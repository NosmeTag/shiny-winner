let chartInstances = {};

export const initDashboardCharts = (stats) => {
    const ctxStatus = document.getElementById('chart-status');
    const ctxRanking = document.getElementById('chart-ranking');

    if (ctxStatus) {
        if (chartInstances.status) chartInstances.status.destroy();

        const total = 40; // Hardcoded for now, or pass as arg
        const free = Math.max(0, total - stats.inUse - stats.maintenanced - stats.defective);

        chartInstances.status = new Chart(ctxStatus, {
            type: 'doughnut',
            data: {
                labels: ['Livres', 'Em Uso', 'Manutenção', 'Defeito'],
                datasets: [{
                    data: [free, stats.inUse, stats.maintenanced, stats.defective],
                    backgroundColor: ['#10b981', '#ef4444', '#334155', '#facc15'],
                    borderWidth: 0
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });
    }

    if (ctxRanking) {
        if (chartInstances.ranking) chartInstances.ranking.destroy();

        const sortedTeachers = Object.entries(stats.teacherStats)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        chartInstances.ranking = new Chart(ctxRanking, {
            type: 'bar',
            data: {
                labels: sortedTeachers.map(t => t[0].split(' ')[0]),
                datasets: [{
                    label: 'Qtd.',
                    data: sortedTeachers.map(t => t[1]),
                    backgroundColor: '#fcb900',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, grid: { display: false } },
                    x: { grid: { display: false } }
                }
            }
        });
    }
};
