import 'dotenv/config';
import { Sequelize } from 'sequelize';

const databaseUrl = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/norm';
const useSsl = process.env.NODE_ENV === 'production';

export const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  define: { underscored: true },
  logging:
    process.env.NODE_ENV === 'development' && process.env.SQL_LOGGING === 'true'
      ? console.log
      : false,
  dialectOptions: useSsl ? { ssl: { require: true, rejectUnauthorized: false } } : {},
  pool: { max: 8, min: 0, acquire: 30000, idle: 10000 },
});
