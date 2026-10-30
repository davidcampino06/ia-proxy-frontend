/**
 * One dot for every request allowed in the current minute.
 * Filled dots are requests already used.
 */
export default function RequestPips({ used, limit }) {
  if (limit === null) {
    return <p className="pips-unlimited">No requests-per-minute limit</p>
  }
  return (
    <div
      className={`pips ${limit > 20 ? 'pips-dense' : ''}`}
      role="img"
      aria-label={`${used} of ${limit} requests used this minute`}
    >
      {Array.from({ length: limit }, (_, i) => (
        <span key={i} className={i < used ? 'pip pip-on' : 'pip'} />
      ))}
    </div>
  )
}
