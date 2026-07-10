/** Modern Chart.js defaults for SMS Pro */
export const SMS_CHART_COLORS = [
  '#6366f1',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#06b6d4',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
]

export const formatMK = (v) =>
  new Intl.NumberFormat('en-MW', {
    style: 'currency',
    currency: 'MWK',
    minimumFractionDigits: 0,
  }).format(v)

export const modernChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { intersect: false, mode: 'index' },
  plugins: {
    legend: {
      labels: { usePointStyle: true, padding: 16, color: '#94a3b8', font: { size: 12 } },
    },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.92)',
      padding: 12,
      cornerRadius: 10,
      titleFont: { size: 13, weight: '600' },
      bodyFont: { size: 12 },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: '#94a3b8', maxRotation: 45, minRotation: 0, font: { size: 11 } },
    },
    y: {
      grid: { color: 'rgba(148, 163, 184, 0.12)' },
      ticks: { color: '#94a3b8', font: { size: 11 } },
      beginAtZero: true,
    },
  },
}

export const lineChartDataset = (label, data, color = '#6366f1') => ({
  label,
  data,
  borderColor: color,
  backgroundColor: `${color}22`,
  fill: true,
  tension: 0.4,
  borderWidth: 2.5,
  pointRadius: 4,
  pointHoverRadius: 7,
  pointBackgroundColor: color,
  pointBorderColor: '#fff',
  pointBorderWidth: 2,
})

export const barChartDataset = (label, data, color = '#6366f1') => ({
  label,
  data,
  backgroundColor: data.map((_, i) => SMS_CHART_COLORS[i % SMS_CHART_COLORS.length]),
  borderRadius: 8,
  borderSkipped: false,
  maxBarThickness: 48,
})
