import { DataTypes, Model } from 'sequelize';
import { DEFAULT_CRITICAL_PATHS } from '../config/constants.js';

export class Repository extends Model {}

export function initRepository(sequelize) {
  Repository.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    teamId: { type: DataTypes.INTEGER, allowNull: false },
    githubRepositoryId: { type: DataTypes.BIGINT, allowNull: true },
    owner: { type: DataTypes.STRING(100), allowNull: false },
    name: { type: DataTypes.STRING(100), allowNull: false },
    fullName: { type: DataTypes.STRING(205), allowNull: false },
    htmlUrl: { type: DataTypes.STRING(500), allowNull: false },
    defaultBranch: { type: DataTypes.STRING(255), allowNull: false, defaultValue: 'main' },
    criticalPaths: { type: DataTypes.JSONB, allowNull: false, defaultValue: DEFAULT_CRITICAL_PATHS },
    agentAccounts: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    lowRiskMaxLines: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 50, validate: { min: 0, max: 10000 } },
    lastSyncedAt: { type: DataTypes.DATE, allowNull: true },
  }, {
    sequelize,
    modelName: 'Repository',
    tableName: 'repositories',
    indexes: [{ unique: true, fields: ['team_id', 'owner', 'name'] }, { fields: ['team_id'] }],
  });
  return Repository;
}

