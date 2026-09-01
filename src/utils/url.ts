/**
 * Normalizes a URL string so that links without a scheme (e.g. linkedin.com/in/user, github.com/repo)
 * are properly prefixed with https:// for interactive clicks and PDF export.
 */
export function normalizeUrl(url?: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

/**
 * Strips http://, https://, and trailing slashes for clean presentation in resumes.
 */
export function displayUrl(url?: string): string {
  if (!url) return '';
  return url.replace(/^https?:\/\//i, '').replace(/\/$/, '');
}
