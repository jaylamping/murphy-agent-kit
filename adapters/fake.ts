import type {
  EvidenceAdapter,
  SourceControlAdapter,
  SpecificationAdapter,
  WorkTrackingAdapter,
} from "./types.js";

/** In-memory fake adapters for qualification — never touch real systems. */

export class FakeSpecificationAdapter implements SpecificationAdapter {
  constructor(private readonly specs = new Map<string, Record<string, unknown>>()) {}

  async load(id: string): Promise<Record<string, unknown>> {
    const s = this.specs.get(id);
    if (!s) throw new Error(`spec not found: ${id}`);
    return structuredClone(s);
  }

  async validate(spec: Record<string, unknown>): Promise<{ ok: boolean; errors: string[] }> {
    const errors: string[] = [];
    if (!spec.acceptanceCriteria || !(spec.acceptanceCriteria as unknown[]).length) {
      errors.push("missing-acceptance-criteria");
    }
    if (!spec.requirements || !(spec.requirements as unknown[]).length) {
      errors.push("missing-requirements");
    }
    return { ok: errors.length === 0, errors };
  }

  seed(id: string, spec: Record<string, unknown>): void {
    this.specs.set(id, spec);
  }
}

export class FakeWorkTrackingAdapter implements WorkTrackingAdapter {
  readonly mode: "readonly" | "mutating";
  private issues = new Map<string, Record<string, unknown>>();
  private ops = new Map<string, { key: string }>();
  mutations = 0;

  constructor(mode: "readonly" | "mutating" = "mutating") {
    this.mode = mode;
  }

  seed(key: string, fields: Record<string, unknown>): void {
    this.issues.set(key, fields);
  }

  async getIssue(key: string): Promise<Record<string, unknown>> {
    const i = this.issues.get(key);
    if (!i) throw new Error(`issue not found: ${key}`);
    return structuredClone(i);
  }

  async createIssue(
    fields: Record<string, unknown>,
    opKey: string,
  ): Promise<{ key: string }> {
    if (this.mode === "readonly") throw new Error("readonly adapter");
    const existing = this.ops.get(opKey);
    if (existing) return existing;
    this.mutations += 1;
    const key = String(fields.key ?? `FAKE-${this.mutations}`);
    this.issues.set(key, fields);
    const result = { key };
    this.ops.set(opKey, result);
    return result;
  }

  async updateIssue(
    key: string,
    fields: Record<string, unknown>,
    opKey: string,
  ): Promise<void> {
    if (this.mode === "readonly") throw new Error("readonly adapter");
    if (this.ops.has(opKey)) return;
    this.mutations += 1;
    const cur = this.issues.get(key) ?? {};
    this.issues.set(key, { ...cur, ...fields });
    this.ops.set(opKey, { key });
  }
}

export class FakeSourceControlAdapter implements SourceControlAdapter {
  readonly mode: "readonly" | "mutating";
  private prs = new Map<string, { number: number; url: string }>();
  mutations = 0;

  constructor(mode: "readonly" | "mutating" = "mutating") {
    this.mode = mode;
  }

  async getRepo(owner: string, name: string): Promise<Record<string, unknown>> {
    return { owner, name, private: true, defaultBranch: "main" };
  }

  async createPullRequest(
    input: Record<string, unknown>,
    opKey: string,
  ): Promise<{ number: number; url: string }> {
    if (this.mode === "readonly") throw new Error("readonly adapter");
    const existing = this.prs.get(opKey);
    if (existing) return existing;
    this.mutations += 1;
    const result = {
      number: this.mutations,
      url: `https://example.test/pr/${this.mutations}`,
    };
    this.prs.set(opKey, result);
    void input;
    return result;
  }
}

export class FakeEvidenceAdapter implements EvidenceAdapter {
  constructor(private readonly ci = new Map<string, boolean>()) {}

  setCi(ref: string, passed: boolean): void {
    this.ci.set(ref, passed);
  }

  async fetchCiStatus(ref: string): Promise<{ passed: boolean; url?: string }> {
    return { passed: this.ci.get(ref) ?? false, url: `https://ci.test/${ref}` };
  }
}
