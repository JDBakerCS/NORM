import { AppError } from '../utils/AppError.js';
import { enqueueWebhookDelivery, registerWebhookDelivery, verifyWebhookSignature } from '../services/webhookService.js';

export async function receiveGitHubWebhook(request, response) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) throw new AppError('GitHub webhooks are not configured', 503, 'GITHUB_WEBHOOK_SECRET_MISSING');
  if (!Buffer.isBuffer(request.body)) throw new AppError('GitHub webhook payload must be raw JSON', 400, 'WEBHOOK_PAYLOAD_INVALID');

  const signature = request.get('X-Hub-Signature-256');
  if (!verifyWebhookSignature(request.body, signature, secret)) {
    throw new AppError('GitHub webhook signature is invalid', 401, 'WEBHOOK_SIGNATURE_INVALID');
  }

  let payload;
  try {
    payload = JSON.parse(request.body.toString('utf8'));
  } catch {
    throw new AppError('GitHub webhook payload is not valid JSON', 400, 'WEBHOOK_PAYLOAD_INVALID');
  }

  const result = await registerWebhookDelivery({
    deliveryId: request.get('X-GitHub-Delivery'),
    event: request.get('X-GitHub-Event'),
    payload,
  });
  if (result.shouldProcess) enqueueWebhookDelivery(result.delivery.id);
  response.status(result.duplicate ? 200 : 202).json({
    received: true,
    duplicate: result.duplicate,
    event: result.delivery.githubEvent,
  });
}
