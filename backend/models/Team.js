import { DataTypes, Model } from 'sequelize';

export class Team extends Model {}

export function initTeam(sequelize) {
  Team.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(120), allowNull: false },
  }, { sequelize, modelName: 'Team', tableName: 'teams' });
  return Team;
}

