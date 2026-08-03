import { sequelize, Team, TeamMember, User } from '../models/index.js';
import { createToken, hashPassword, verifyPassword } from '../services/authService.js';
import { AppError } from '../utils/AppError.js';

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export async function register(request, response) {
  const name = String(request.body.name || '').trim();
  const email = normalizeEmail(request.body.email);
  const password = String(request.body.password || '');
  if (name.length < 2) throw new AppError('Name must be at least 2 characters', 400, 'VALIDATION_ERROR');
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new AppError('A valid email is required', 400, 'VALIDATION_ERROR');
  if (password.length < 10) throw new AppError('Password must be at least 10 characters', 400, 'VALIDATION_ERROR');
  if (await User.findOne({ where: { email } })) throw new AppError('An account with that email already exists', 409, 'EMAIL_IN_USE');

  const user = await sequelize.transaction(async (transaction) => {
    const createdUser = await User.create({ name, email, passwordHash: await hashPassword(password) }, { transaction });
    const team = await Team.create({ name: `${name}'s Team` }, { transaction });
    await TeamMember.create({ userId: createdUser.id, teamId: team.id, role: 'OWNER' }, { transaction });
    return createdUser;
  });
  response.status(201).json({ user, token: createToken(user) });
}

export async function login(request, response) {
  const email = normalizeEmail(request.body.email);
  const password = String(request.body.password || '');
  const user = await User.findOne({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) throw new AppError('Email or password is incorrect', 401, 'INVALID_CREDENTIALS');
  response.json({ user, token: createToken(user) });
}

export async function me(request, response) {
  response.json({ user: request.user });
}

