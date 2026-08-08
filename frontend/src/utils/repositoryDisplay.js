export function getRepositoryDisplayName(repository = {}) {
  const repositoryName = String(repository.name || '').trim();
  if (repositoryName) return repositoryName;

  const fullName = String(repository.fullName || '').trim();
  return fullName.split('/').filter(Boolean).at(-1) || 'Repository';
}
