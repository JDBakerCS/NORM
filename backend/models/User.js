import { DataTypes, Model } from 'sequelize';

export class User extends Model {
  toJSON() {
    const values = { ...this.get() };
    delete values.passwordHash;
    return values;
  }
}

export function initUser(sequelize) {
  User.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(120), allowNull: false },
    email: { type: DataTypes.STRING(254), allowNull: false, unique: true, validate: { isEmail: true } },
    passwordHash: { type: DataTypes.STRING, allowNull: false },
    githubUsername: { type: DataTypes.STRING(100), allowNull: true },
  }, { sequelize, modelName: 'User', tableName: 'users' });
  return User;
}

