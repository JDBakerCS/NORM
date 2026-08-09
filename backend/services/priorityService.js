import { isDocumentationOnly, normalizePath, touchesCriticalPath } from './pathService.js';

const URGENCY = {
  'priority:critical': [40, 'Critical-priority label'],
  'priority:high': [30, 'High-priority label'],
  'priority:medium': [20, 'Medium-priority label'],
  'priority:normal': [10, 'Normal-priority label'],
};

export function calculateUrgency(labels = []) {
  const normalized = new Set(labels.map((label) => String(label).toLowerCase()));
  for (const [label, result] of Object.entries(URGENCY)) {
    if (normalized.has(label)) return { score: result[0], reason: result[1] };
  }
  return { score: 0, reason: null };
}

export function calculateImpact(paths = [], criticalPaths = []) {
  const files = paths.map(normalizePath);
  const configuredCriticalMatch = touchesCriticalPath(files, criticalPaths);
  const highImpact = /(auth(?:entication)?|permissions?|migrations?|payments?|billing)(\/|\.|$)/i;
  const dataLayer =
    /(^|\/)(models?|entities|schemas?|database|db|associations?|orm|sequelize|prisma|drizzle)(\/|\.|$)/i;
  const operational =
    /(^|\/)(\.github\/workflows|deployment|infrastructure|infra|config\/env)(\/|\.|$)/i;
  const backend = /(^|\/)(backend|server|api|routes?|controllers?|services?)(\/|\.|$)/i;
  const frontend = /(^|\/)(frontend|client|src\/components|src\/pages)(\/|\.|$)/i;

  if (configuredCriticalMatch || files.some((file) => highImpact.test(file))) {
    return {
      score: 25,
      reason:
        'Touches authentication, permissions, migration, payment, or configured critical files',
    };
  }
  if (files.some((file) => dataLayer.test(file))) {
    return { score: 20, reason: 'Touches shared data models, schemas, or associations' };
  }
  if (files.some((file) => operational.test(file)))
    return {
      score: 20,
      reason: 'Touches deployment, infrastructure, workflow, or environment files',
    };
  if (files.some((file) => backend.test(file)))
    return { score: 15, reason: 'Touches backend business logic or API routes' };
  if (files.some((file) => frontend.test(file)))
    return { score: 10, reason: 'Touches frontend application code' };
  if (isDocumentationOnly(files)) return { score: 2, reason: 'Documentation-only change' };
  return { score: 0, reason: null };
}

export function calculateSize(changedLines = 0) {
  const lines = Math.max(0, Number(changedLines) || 0);
  if (lines === 0) return { score: 0, reason: null };
  if (lines <= 50) return { score: 2, reason: `Changes ${lines} lines` };
  if (lines <= 200) return { score: 5, reason: `Changes ${lines} lines` };
  if (lines <= 500) return { score: 10, reason: `Changes ${lines} lines` };
  if (lines <= 1000) return { score: 15, reason: `Changes ${lines} lines` };
  return { score: 20, reason: `Changes ${lines} lines` };
}

export function calculateAge(githubCreatedAt, now = new Date()) {
  const created = new Date(githubCreatedAt);
  if (Number.isNaN(created.getTime())) return { score: 0, reason: null };
  const days = Math.max(0, Math.floor((now.getTime() - created.getTime()) / 86_400_000));
  if (days < 1) return { score: 0, reason: null };
  if (days <= 2) return { score: 5, reason: `Waiting for ${days} ${days === 1 ? 'day' : 'days'}` };
  if (days <= 5) return { score: 10, reason: `Waiting for ${days} days` };
  return { score: 15, reason: `Waiting for ${days} days` };
}

export function calculatePriority(pullRequest, repository, now = new Date()) {
  const urgency = calculateUrgency(pullRequest.labels);
  const impact = calculateImpact(pullRequest.changedFilePaths, repository.criticalPaths);
  const size = calculateSize(pullRequest.changedLines);
  const age = calculateAge(pullRequest.githubCreatedAt, now);
  const components = [urgency, impact, size, age];
  return {
    urgencyScore: urgency.score,
    impactScore: impact.score,
    sizeScore: size.score,
    ageScore: age.score,
    priorityScore: Math.min(
      100,
      components.reduce((total, item) => total + item.score, 0),
    ),
    priorityReasons: components.map((item) => item.reason).filter(Boolean),
  };
}
