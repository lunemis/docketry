const DOCUMENT_KEY_RE = /^[a-z0-9][a-z0-9._/-]{0,119}$/;

export function normalizeDocumentKey(value: string): string | null {
  const key = value.trim().toLowerCase();
  if (
    !DOCUMENT_KEY_RE.test(key) ||
    key.includes("..") ||
    key.includes("//") ||
    key.endsWith("/")
  ) {
    return null;
  }
  return key;
}
