// Shared with Edge middleware: keep this module free of Node-only imports.
export const isStaging = () => process.env.DEPLOYMENT_STAGE === "staging";

export function stagingEmails() {
  return (process.env.STAGING_ALLOWED_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function stagingEmailAllowed(email: string) {
  return !isStaging() || stagingEmails().includes(email.trim().toLowerCase());
}

export function stagingAccessConfigured() {
  return (
    /^[A-Za-z0-9@._-]{1,120}$/.test(process.env.STAGING_ACCESS_USER ?? "") &&
    /^[A-Za-z0-9+/=_-]{32,256}$/.test(process.env.STAGING_ACCESS_PASSWORD ?? "")
  );
}

export async function stagingAccessAllowed(authorization: string | null) {
  if (
    !stagingAccessConfigured() ||
    !authorization ||
    authorization.length > 1024
  )
    return false;
  const match = /^Basic ([A-Za-z0-9+/]+=*)$/i.exec(authorization);
  if (!match) return false;
  let decoded: string;
  try {
    decoded = atob(match[1]);
  } catch {
    return false;
  }
  const expected = `${process.env.STAGING_ACCESS_USER}:${process.env.STAGING_ACCESS_PASSWORD}`;
  const digest = async (value: string) =>
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    );
  const [actualHash, expectedHash] = await Promise.all([
    digest(decoded),
    digest(expected),
  ]);
  let difference = 0;
  for (let i = 0; i < actualHash.length; i++)
    difference |= actualHash[i] ^ expectedHash[i];
  return difference === 0;
}
