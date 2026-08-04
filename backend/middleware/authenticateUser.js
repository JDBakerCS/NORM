import { User } from '../models/index.js';
import { getUserIdFromPayload, verifyToken } from '../services/authService.js';
import { AppError } from '../utils/AppError.js';

export async function authenticateUser(request, response, next) {
  try {
    const authorization = request.get('authorization') || '';
    const [scheme, token] = authorization.split(' ');
    if (scheme !== 'Bearer' || !token) {
      response.set('WWW-Authenticate', 'Bearer');
      throw new AppError('Authentication is required', 401, 'AUTH_REQUIRED');
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      throw new AppError('Your session is invalid or expired', 401, 'SESSION_EXPIRED');
    }

    const userId = getUserIdFromPayload(payload);
    if (!userId) throw new AppError('Your session is invalid or expired', 401, 'SESSION_EXPIRED');

    const user = await User.findByPk(userId);
    if (!user) throw new AppError('Your session is invalid or expired', 401, 'SESSION_EXPIRED');
    request.user = user;
    next();
  } catch (error) {
    next(error);
  }
}
