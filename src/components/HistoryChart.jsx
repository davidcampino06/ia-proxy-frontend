import { Bar } from 'react-chartjs-2'
import { BarElement, CategoryScale, Chart as ChartJS, LinearScale, Tooltip } from 'chart.js'
import { fmt } from '../api'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip)

const DAY = new Intl.DateTimeFormat('en-US', { weekday: 'short' })
const FULL = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

function toDate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export default function HistoryChart({ history, color }) {
  const total = history.reduce((acc, d) => acc + d.tokens, 0)
  const requests = history.reduce((acc, d) => acc + d.requests, 0)
  const peak = history.reduce((best, d) => (d.tokens > (best?.tokens ?? -1) ? d : best), null)

  if (history.length === 0) {
    return <p className="hint">No usage data yet.</p>
  }

  const data = {
    labels: history.map((d, i) => (i === history.length - 1 ? 'Today' : DAY.format(toDate(d.date)))),
    datasets: [
      {
        data: history.map((d) => d.tokens),
        backgroundColor: history.map((_, i) => (i === history.length - 1 ? color : `${color}59`)),
        hoverBackgroundColor: color,
        borderRadius: 5,
        maxBarThickness: 30,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 350 },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#18233A',
        padding: 10,
        displayColors: false,
        titleFont: { family: 'Figtree', weight: '600' },
        bodyFont: { family: 'Figtree' },
        callbacks: {
          title: (items) => FULL.format(toDate(history[items[0].dataIndex].date)),
          label: (ctx) => {
            const d = history[ctx.dataIndex]
            return [`${fmt(d.tokens)} tokens`, `${d.requests} ${d.requests === 1 ? 'request' : 'requests'}`]
          },
        },
      },
    },
    scales: {
      x: { grid: { display: false }, border: { display: false }, ticks: { color: '#5B6B82', font: { family: 'Figtree' } } },
      y: {
        beginAtZero: true,
        grid: { color: '#E4E9F0' },
        border: { display: false },
        ticks: {
          color: '#5B6B82',
          font: { family: 'Figtree' },
          maxTicksLimit: 4,
          precision: 0,
          callback: (v) => (v >= 1000 ? `${v / 1000}k` : v),
        },
      },
    },
  }

  return (
    <div>
      <div className="chart-box">
        <Bar data={data} options={options} aria-label="Tokens used per day over the last 7 days" role="img" />
      </div>
      <dl className="facts facts-row">
        <div>
          <dt>7-day total</dt>
          <dd>{fmt(total)}</dd>
        </div>
        <div>
          <dt>Requests</dt>
          <dd>{fmt(requests)}</dd>
        </div>
        <div>
          <dt>Busiest day</dt>
          <dd>{peak && peak.tokens > 0 ? DAY.format(toDate(peak.date)) : 'None'}</dd>
        </div>
      </dl>
    </div>
  )
}
