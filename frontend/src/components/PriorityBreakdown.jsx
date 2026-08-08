import { getAttentionLevel, getReviewSize, getWaitingTime } from '../utils/priorityDisplay.js';

export default function PriorityBreakdown({ pullRequest }) {
  const attention = getAttentionLevel(pullRequest);
  const reviewSize = getReviewSize(pullRequest);
  const waiting = getWaitingTime(pullRequest.githubCreatedAt);

  return (
    <div className="priority-breakdown">
      <div className="priority-fact"><span>Attention</span><strong>{attention.label}</strong><small>{attention.description}</small></div>
      <div className="priority-fact"><span>Review size</span><strong>{reviewSize.label}</strong><small>{reviewSize.description}</small></div>
      <div className="priority-fact"><span>Waiting</span><strong>{waiting.label}</strong><small>Time since this pull request opened</small></div>
    </div>
  );
}
