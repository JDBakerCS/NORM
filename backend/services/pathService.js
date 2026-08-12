const DOCUMENTATION_PATTERNS = [
  /(^|\/)docs?\//i,
  /(^|\/)readme(?:\.[^/]*)?$/i,
  /(^|\/)changelog(?:\.[^/]*)?$/i,
  /\.mdx?$/i,
  /\.txt$/i,
];

export const normalizePath = (value = '') =>
  value.replaceAll('\\', '/').replace(/^\.\//, '').toLowerCase();

export function pathMatches(filePath, configuredPath) {
  const file = normalizePath(filePath);
  const rule = normalizePath(configuredPath).replace(/\*+$/, '');
  if (!rule) return false;
  return file === rule.replace(/\/$/, '') || file.startsWith(rule);
}

export const isDocumentationPath = (filePath) =>
  DOCUMENTATION_PATTERNS.some((pattern) => pattern.test(normalizePath(filePath)));

export function isDocumentationOnly(paths = []) {
  return paths.length > 0 && paths.every(isDocumentationPath);
}

export function touchesCriticalPath(paths = [], criticalPaths = []) {
  return paths.some((filePath) =>
    criticalPaths.some((criticalPath) => pathMatches(filePath, criticalPath)),
  );
}
