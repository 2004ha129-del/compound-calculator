/**
 * 複利計算機 - チャート描画
 */

const ChartManager = {
    charts: {},

    // テーマに応じた色を取得
    getThemeColors() {
        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        return {
            textColor: isLight ? '#334155' : '#94a3b8',
            gridColor: isLight ? 'rgba(100, 116, 139, 0.2)' : 'rgba(148, 163, 184, 0.1)',
            tooltipBg: isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 23, 42, 0.95)',
            tooltipTitle: isLight ? '#1e293b' : '#f1f5f9',
            tooltipBody: isLight ? '#475569' : '#94a3b8'
        };
    },

    getDefaultOptions() {
        const colors = this.getThemeColors();
        return {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 800, easing: 'easeOutQuart' },
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        color: colors.textColor,
                        padding: 15,
                        font: { family: "'Inter', sans-serif", size: 11 },
                        usePointStyle: true
                    }
                },
                tooltip: {
                    backgroundColor: colors.tooltipBg,
                    titleColor: colors.tooltipTitle,
                    bodyColor: colors.tooltipBody,
                    borderColor: 'rgba(99, 102, 241, 0.5)',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: function (context) {
                            return `${context.dataset.label}: ¥${Math.round(context.parsed.y).toLocaleString('ja-JP')}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: colors.gridColor, drawBorder: false },
                    ticks: { color: colors.textColor, font: { size: 10 } }
                },
                y: {
                    stacked: true,
                    grid: { color: colors.gridColor, drawBorder: false },
                    ticks: {
                        color: colors.textColor,
                        font: { family: "'JetBrains Mono', monospace", size: 10 },
                        callback: function (value) {
                            if (value >= 100000000) return (value / 100000000).toFixed(1) + '億';
                            if (value >= 10000) return (value / 10000).toFixed(0) + '万';
                            return value.toLocaleString('ja-JP');
                        }
                    }
                }
            }
        };
    },

    renderCompoundChart(canvasId, yearlyData) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        if (this.charts[canvasId]) this.charts[canvasId].destroy();

        const labels = yearlyData.map(d => d.year === 0 ? '開始' : `${d.year}年`);

        this.charts[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    { label: '元金', data: yearlyData.map(d => d.principal), backgroundColor: 'rgba(99, 102, 241, 0.7)', borderRadius: 4, stack: 'stack1' },
                    { label: '利息', data: yearlyData.map(d => d.interest), backgroundColor: 'rgba(34, 211, 238, 0.7)', borderRadius: 4, stack: 'stack1' }
                ]
            },
            options: (() => { const opts = this.getDefaultOptions(); return { ...opts, scales: { ...opts.scales, x: { ...opts.scales.x, stacked: true } } }; })()
        });
    },

    renderTaxedChart(canvasId, yearlyData) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        if (this.charts[canvasId]) this.charts[canvasId].destroy();

        const labels = yearlyData.map(d => d.year === 0 ? '開始' : `${d.year}年`);

        const investedData = yearlyData.map(d => d.totalInvested);
        // 元利合計（税引き後）から投資額を引いたものが、実質的な累積利息
        const interestData = yearlyData.map(d => Math.max(0, d.balance - d.totalInvested));

        let cumTax = 0;
        const taxLineData = yearlyData.map(d => { cumTax += d.tax || 0; return cumTax; });

        this.charts[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: '利息（税引後）',
                        data: yearlyData.map((d, i) => investedData[i] + interestData[i]),
                        borderColor: 'rgba(34, 211, 238, 1)',
                        backgroundColor: 'rgba(34, 211, 238, 0.2)',
                        fill: '0', // fill down to next dataset (invested)
                        tension: 0.3,
                        pointRadius: 0
                    },
                    {
                        label: '積立総額',
                        data: investedData,
                        borderColor: 'rgba(99, 102, 241, 1)',
                        backgroundColor: 'rgba(99, 102, 241, 0.4)',
                        fill: 'origin',
                        tension: 0.3,
                        pointRadius: 0
                    },
                    {
                        label: '累積税額',
                        data: taxLineData,
                        borderColor: 'rgba(245, 158, 11, 1)',
                        borderWidth: 2,
                        tension: 0.3,
                        pointRadius: 3,
                        borderDash: [5, 5],
                        fill: false
                    }
                ]
            },
            options: (() => {
                const opts = this.getDefaultOptions();
                return {
                    ...opts,
                    plugins: {
                        ...opts.plugins,
                        tooltip: {
                            ...opts.plugins.tooltip,
                            callbacks: {
                                label: function (context) {
                                    const label = context.dataset.label;
                                    let val = context.parsed.y;
                                    if (label === '利息（税引後）') {
                                        const investedVal = context.chart.data.datasets[1].data[context.dataIndex];
                                        val = val - investedVal;
                                    }
                                    return `${label}: ${window.appCurrencySymbol || '¥'}${Math.round(val).toLocaleString('ja-JP')}`;
                                }
                            }
                        }
                    },
                    scales: {
                        ...opts.scales,
                        y: { ...opts.scales.y, stacked: false }
                    }
                };
            })()
        });
    }
};

window.ChartManager = ChartManager;
