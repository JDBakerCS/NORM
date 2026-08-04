import { DataTypes, Model } from 'sequelize';
import { WEBHOOK_DELIVERY_STATUSES } from '../config/constants.js';

export class WebhookDelivery extends Model {}

export function initWebhookDelivery(sequelize) {
  WebhookDelivery.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    deliveryId: { type: DataTypes.STRING(120), allowNull: false },
    githubEvent: { type: DataTypes.STRING(80), allowNull: false },
    action: { type: DataTypes.STRING(100), allowNull: true },
    repositoryOwner: { type: DataTypes.STRING(100), allowNull: true },
    repositoryName: { type: DataTypes.STRING(100), allowNull: true },
    pullRequestNumbers: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    headSha: { type: DataTypes.STRING(64), allowNull: true },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'PENDING', validate: { isIn: [WEBHOOK_DELIVERY_STATUSES] } },
    errorSummary: { type: DataTypes.STRING(200), allowNull: true },
    processedAt: { type: DataTypes.DATE, allowNull: true },
  }, {
    sequelize,
    modelName: 'WebhookDelivery',
    tableName: 'webhook_deliveries',
    indexes: [{ unique: true, fields: ['delivery_id'] }, { fields: ['status', 'created_at'] }],
  });
  return WebhookDelivery;
}
