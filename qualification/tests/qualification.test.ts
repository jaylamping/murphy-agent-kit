import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runQualification } from "./run-qualification.js";

describe("qualification suite", () => {
  it("passes all required cases", async () => {
    const result = await runQualification();
    const failed = result.results.filter((r) => !r.ok);
    assert.deepEqual(
      failed.map((f) => `${f.id}:${f.detail}`),
      [],
    );
    assert.equal(result.ok, true);
  });
});
