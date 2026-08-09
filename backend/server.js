import 'dotenv/config';
import app from './app.js';
import { sequelize } from './config/database.js';
import { resumePendingWebhookDeliveries } from './services/webhookService.js';

const port = Number(process.env.PORT) || 8080;

async function startServer() {
  try {
    await sequelize.authenticate();
    app.listen(port, () => {
      console.log(`NORM backend listening on port ${port}`);
      resumePendingWebhookDeliveries().catch((error) =>
        console.error(`[WEBHOOK_RECOVERY_FAILED] ${error.message}`),
      );
    });
  } catch (error) {
    console.error(`Database connection failed: ${error.message}`);
    process.exit(1);
  }
}

startServer();
