/**
 * Credential boundary helpers. Never persist secrets to state or evidence.
 */

const SECRET_PATTERNS: RegExp[] = [
  /\b(sk-[a-zA-Z0-9_-]{16,})\b/g,
  /\b(ghp_[a-zA-Z0-9]{20,})\b/g,
  /\b(xox[baprs]-[a-zA-Z0-9-]{10,})\b/g,
  /\b(AKIA[0-9A-Z]{16})\b/g,
  /\b(Bearer\s+[a-zA-Z0-9._\-]+)\b/gi,
  /\b(password\s*[:=]\s*\S+)/gi,
  /\b(api[_-]?key\s*[:=]\s*\S+)/gi,
  /\b(customer[_-]?email\s*[:=]\s*\S+)/gi,
  /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g,
];

export function getCursorApiKey(): string | undefined {
  const key = process.env.CURSOR_API_KEY;
  return key && key.length > 0 ? key : undefined;
}

export function requireCursorApiKey(): string {
  const key = getCursorApiKey();
  if (!key) {
    throw new Error("CURSOR_API_KEY missing — escalate to human");
  }
  return key;
}

export function redactSecrets(input: string): string {
  let out = input;
  for (const re of SECRET_PATTERNS) {
    out = out.replace(re, "[REDACTED]");
  }
  return out;
}

export function assertNoSecrets(input: string, context: string): void {
  const redacted = redactSecrets(input);
  if (redacted !== input) {
    throw new Error(`Secret/PII leak detected in ${context}`);
  }
}

export function roleMayMutateExternal(role: string): boolean {
  return role === "junior" || role === "senior" || role === "architect";
}

export function roleIsReadonly(role: string): boolean {
  return (
    role === "intern" ||
    role === "architect" ||
    role === "principal" ||
    role === "orchestrator"
  );
}
