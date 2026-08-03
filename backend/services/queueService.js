import { isDocumentationOnly, touchesCriticalPath } from './pathService.js';

export function classifyQueue(pullRequest, repository) {
  if (pullRequest.isDraft) return { queueStatus: 'WAITING', reason: 'Draft pull request' };
  if (pullRequest.ciStatus === 'RUNNING') return { queueStatus: 'WAITING', reason: 'Checks are still running' };
  if (pullRequest.ciStatus === 'FAILED') return { queueStatus: 'RETURN_TO_AGENT', reason: 'Checks failed' };
  if (pullRequest.reviewStatus === 'CHANGES_REQUESTED') return { queueStatus: 'RETURN_TO_AGENT', reason: 'A reviewer requested changes' };
  if (pullRequest.mergeableStatus === 'CONFLICTING') return { queueStatus: 'RETURN_TO_AGENT', reason: 'Merge conflicts must be resolved' };

  const documentationOnly = isDocumentationOnly(pullRequest.changedFilePaths);
  const belowLimit = pullRequest.changedLines <= repository.lowRiskMaxLines;
  const critical = touchesCriticalPath(pullRequest.changedFilePaths, repository.criticalPaths);
  if (documentationOnly && belowLimit && !critical) {
    return { queueStatus: 'LOW_RISK', reason: `Documentation-only change within the ${repository.lowRiskMaxLines}-line low-risk limit` };
  }
  return {
    queueStatus: 'REVIEW_NOW',
    reason: pullRequest.ciStatus === 'NOT_AVAILABLE' ? 'Ready for review; no checks are available' : 'Ready for human review',
  };
}

