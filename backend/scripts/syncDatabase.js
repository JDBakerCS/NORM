import '../models/index.js';
import { sequelize } from '../config/database.js';

try {
  await sequelize.authenticate();
  await sequelize.sync({ alter: false, force: false });
  console.log('NORM database schema is ready. No data was removed.');
} catch (error) {
  console.error(`Database setup failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}

