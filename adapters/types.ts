/** Adapter interfaces — implementations may be fake (qualification) or real. */

export interface SpecificationAdapter {
  load(id: string): Promise<Record<string, unknown>>;
  validate(spec: Record<string, unknown>): Promise<{ ok: boolean; errors: string[] }>;
}

export interface WorkTrackingAdapter {
  getIssue(key: string): Promise<Record<string, unknown>>;
  createIssue?(fields: Record<string, unknown>, opKey: string): Promise<{ key: string }>;
  updateIssue?(key: string, fields: Record<string, unknown>, opKey: string): Promise<void>;
  readonly mode: "readonly" | "mutating";
}

export interface SourceControlAdapter {
  getRepo(owner: string, name: string): Promise<Record<string, unknown>>;
  createPullRequest?(
    input: Record<string, unknown>,
    opKey: string,
  ): Promise<{ number: number; url: string }>;
  readonly mode: "readonly" | "mutating";
}

export interface EvidenceAdapter {
  fetchCiStatus(ref: string): Promise<{ passed: boolean; url?: string }>;
  recordRelease?(payload: Record<string, unknown>, opKey: string): Promise<void>;
}
