const TABS = [
  ['REVIEW_NOW', 'Review now'],
  ['RETURN_TO_AGENT', 'Return to agent'],
  ['WAITING', 'Waiting'],
  ['LOW_RISK', 'Low risk'],
];

export default function QueueTabs({ active, counts, onChange }) {
  return (
    <div className="queue-tabs" role="tablist" aria-label="Pull-request queues">
      {TABS.map(([value, label]) => (
        <button
          className={active === value ? 'active' : ''}
          type="button"
          role="tab"
          aria-selected={active === value}
          key={value}
          onClick={() => onChange(value)}
        >
          <span>{label}</span>
          <b>{counts[value] || 0}</b>
        </button>
      ))}
    </div>
  );
}
