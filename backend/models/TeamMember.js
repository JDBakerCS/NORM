import { DataTypes, Model } from 'sequelize';

export class TeamMember extends Model {}

export function initTeamMember(sequelize) {
  TeamMember.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      teamId: { type: DataTypes.INTEGER, allowNull: false },
      role: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'MEMBER',
        validate: { isIn: [['OWNER', 'ADMIN', 'MEMBER']] },
      },
    },
    {
      sequelize,
      modelName: 'TeamMember',
      tableName: 'team_members',
      indexes: [{ unique: true, fields: ['user_id', 'team_id'] }, { fields: ['team_id'] }],
    },
  );
  return TeamMember;
}
