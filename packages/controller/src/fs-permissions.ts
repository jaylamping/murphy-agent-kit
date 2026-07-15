import { chmodSync } from "node:fs";

/** Owner-only mode is meaningful on POSIX; on Windows NTFS this is a no-op. */
export function tryOwnerOnly(path: string): void {
  if (process.platform === "win32") return;
  try {
    chmodSync(path, 0o700);
  } catch {
    /* may not own parent or FS may ignore mode */
  }
}

export function tryOwnerOnlyFile(path: string): void {
  if (process.platform === "win32") return;
  try {
    chmodSync(path, 0o600);
  } catch {
    /* ignore */
  }
}
