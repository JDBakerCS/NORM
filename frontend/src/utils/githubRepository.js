const OWNER_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const REPOSITORY_PATTERN = /^[A-Za-z0-9._-]{1,100}$/;

const INVALID_URL_MESSAGE =
  'Paste a GitHub repository URL like https://github.com/owner/repository';

export function parseGitHubRepositoryUrl(input) {
  const value = String(input || '').trim();
  if (!value) throw new Error("Paste the repository's GitHub URL");

  let url;
  try {
    url = new URL(value.includes('://') ? value : `https://${value}`);
  } catch {
    throw new Error(INVALID_URL_MESSAGE);
  }

  if (!['github.com', 'www.github.com'].includes(url.hostname.toLowerCase())) {
    throw new Error(INVALID_URL_MESSAGE);
  }

  const pathParts = url.pathname.split('/').filter(Boolean);
  if (pathParts.length !== 2) throw new Error(INVALID_URL_MESSAGE);

  const [owner, repositoryWithSuffix] = pathParts;
  const name = repositoryWithSuffix.replace(/\.git$/i, '');

  if (
    !OWNER_PATTERN.test(owner) ||
    !REPOSITORY_PATTERN.test(name) ||
    name === '.' ||
    name === '..'
  ) {
    throw new Error(INVALID_URL_MESSAGE);
  }

  return { owner, name };
}
