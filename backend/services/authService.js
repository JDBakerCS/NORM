import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/AppError.js';

const SALT_ROUNDS = 12;

function jwtSecret() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
    throw new AppError(
      'JWT_SECRET must be configured with at least 16 characters',
      500,
      'JWT_NOT_CONFIGURED',
    );
  }
  return process.env.JWT_SECRET;
}

export const hashPassword = (password) => bcrypt.hash(password, SALT_ROUNDS);
export const verifyPassword = (password, passwordHash) => bcrypt.compare(password, passwordHash);
export const createToken = (user) =>
  jwt.sign({ sub: String(user.id), email: user.email }, jwtSecret(), { expiresIn: '8h' });
export const verifyToken = (token) => jwt.verify(token, jwtSecret());
export const getUserIdFromPayload = (payload) => {
  const userId = Number(payload?.sub);
  return Number.isSafeInteger(userId) && userId > 0 ? userId : null;
};
