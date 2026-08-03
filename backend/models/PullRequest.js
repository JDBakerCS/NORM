import { DataTypes, Model } from 'sequelize';
import { CI_STATUSES, MERGEABLE_STATUSES, QUEUE_STATUSES, REVIEW_STATUSES } from '../config/constants.js';

export class PullRequest extends Model {}

export function initPullRequest(sequelize) {
  PullRequest.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    repositoryId: { type: DataTypes.INTEGER, allowNull: false },
    githubPullRequestId: { type: DataTypes.BIGINT, allowNull: false },
    number: { type: DataTypes.INTEGER, allowNull: false },
    title: { type: DataTypes.STRING(500), allowNull: false },
    bodyPreview: { type: DataTypes.STRING(500), allowNull: true },
    authorLogin: { type: DataTypes.STRING(120), allowNull: false, defaultValue: 'unknown' },
    authorType: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'User' },
    htmlUrl: { type: DataTypes.STRING(500), allowNull: false },
    branchName: { type: DataTypes.STRING(255), allowNull: false },
    state: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'open' },
    isDraft: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    isAgentGenerated: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    labels: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    additions: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    deletions: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    changedLines: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    changedFilesCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    changedFilePaths: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    headSha: { type: DataTypes.STRING(64), allowNull: false, defaultValue: '' },
    ciStatus: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'NOT_AVAILABLE', validate: { isIn: [CI_STATUSES] } },
    reviewStatus: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'NOT_AVAILABLE', validate: { isIn: [REVIEW_STATUSES] } },
    mergeableStatus: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'UNKNOWN', validate: { isIn: [MERGEABLE_STATUSES] } },
    queueStatus: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'REVIEW_NOW', validate: { isIn: [QUEUE_STATUSES] } },
    urgencyScore: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    impactScore: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    sizeScore: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    ageScore: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    priorityScore: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    priorityReasons: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    githubCreatedAt: { type: DataTypes.DATE, allowNull: false },
    githubUpdatedAt: { type: DataTypes.DATE, allowNull: false },
    lastSyncedAt: { type: DataTypes.DATE, allowNull: false },
  }, {
    sequelize,
    modelName: 'PullRequest',
    tableName: 'pull_requests',
    indexes: [
      { unique: true, fields: ['repository_id', 'github_pull_request_id'] },
      { unique: true, fields: ['repository_id', 'number'] },
      { fields: ['repository_id', 'state', 'queue_status'] },
      { fields: ['priority_score'] },
    ],
  });
  return PullRequest;
}

