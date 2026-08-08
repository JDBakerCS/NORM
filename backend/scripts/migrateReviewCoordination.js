import { DataTypes } from 'sequelize';
import '../models/index.js';
import { sequelize } from '../config/database.js';

const columns = {
  requested_reviewers: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  requested_teams: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  check_results: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
};

try {
  await sequelize.authenticate();
  const queryInterface = sequelize.getQueryInterface();
  const existingColumns = await queryInterface.describeTable('pull_requests');

  await sequelize.transaction(async (transaction) => {
    for (const [columnName, definition] of Object.entries(columns)) {
      if (!existingColumns[columnName]) {
        await queryInterface.addColumn('pull_requests', columnName, definition, { transaction });
      }
    }
  });

  console.log('Review coordination fields are ready. No data was removed.');
} catch (error) {
  console.error(`Review coordination migration failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
