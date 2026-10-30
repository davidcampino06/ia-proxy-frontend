import { Bar } from 'react-chartjs-2'
import { BarElement, CategoryScale, Chart as ChartJS, LinearScale, Tooltip } from 'chart.js'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip)

const DAY = new Intl.DateTimeFormat('en-US', { weekday: 'short' })

function dayLabel(iso, isToday) {
  if (isToday) return 'Today'
  const [y, m, d] = iso.split('-').map(Number)
  return DAY.format(new Date(y, m - 1, d))
}

export default function HistoryChart({ history, color }) {
  const total = history.reduce((acc, d) => acc + d.tokens, 0)

  const data = {
    labels: history.map((d, i) => dayLabel(d.date, i === history.length - 1)),
    datasets: [
      {
        data: history.map((d) => d.tokens),
        backgroundColor: history.map((_, i) => (i === history.length - 1 ? color : `${color}66`)),
        borderRadius: 4,
        maxBarThickness: 28,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 300 },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const d = history[ctx.dataIndex]
            return `${d.tokens.toLocaleString('en-US')} tokens, ${d.requests} requests`
          },
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#5B6B82', font: { family: 'Figtree' } } },
      y: {
        beginAtZero: true,
        grid: { color: '#DCE2EA' },
        border: { display: false },
        ticks: { color: '#5B6B82', font: { family: 'Figtree' }, maxTicksLimit: 4, precision: 0 },
      },
    },
  }

  return (
    <div>
      <div className="chart-box">
        <Bar data={data} options={options} aria-label="Tokens used per day over the last 7 days" role="img" />
      </div>
      <p className="hint">{total.toLocaleString('en-US')} tokens over the last 7 days</p>
    </div>
  )
}
