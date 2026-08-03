const PARTS = [
  ['urgencyScore', 'Urgency', 40],
  ['impactScore', 'Critical-file impact', 25],
  ['sizeScore', 'Change size', 20],
  ['ageScore', 'Waiting time', 15],
];

export default function PriorityBreakdown({ pullRequest }) {
  return (
    <div className="priority-breakdown">
      <div className="score-total"><span>Priority score</span><strong>{pullRequest.priorityScore}</strong><small>/ 100</small></div>
      <div className="score-parts">
        {PARTS.map(([key, label, max]) => (
          <div className="score-part" key={key}>
            <div><span>{label}</span><strong>{pullRequest[key]} / {max}</strong></div>
            <div className="score-track"><span style={{ width: `${(pullRequest[key] / max) * 100}%` }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

