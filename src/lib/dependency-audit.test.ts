import { describe, expect, it } from "bun:test";
import { auditDependencies, executeAudit } from "../../scripts/audit-dependencies";

describe("bounded dependency audit", () => {
  it("accepts only a successful complete empty graph as clean", async () => {
    const verdict = await auditDependencies({ execute: async () => ({ stdout: "{}", exitCode: 0, timedOut: false }) });
    expect(verdict.status).toBe("clean");
    expect(verdict.attempts).toHaveLength(1);
  });

  it.each([0, 1])("preserves every advisory and fails even when audit exits %i", async (exitCode) => {
    const payload = { package: [{ title: "low advisory", severity: "low" }, { title: "critical advisory", severity: "critical" }] };
    const verdict = await auditDependencies({ execute: async () => ({ stdout: JSON.stringify(payload), exitCode, timedOut: false }) });
    expect(verdict.status).toBe("advisories");
    expect(verdict.advisoryCount).toBe(2);
    expect(verdict.payload).toEqual(payload);
    expect(verdict.attempts).toHaveLength(1);
  });

  it("recovers from a timeout with bounded backoff", async () => {
    let calls = 0;
    const delays: number[] = [];
    const verdict = await auditDependencies({
      execute: async () => ++calls === 1
        ? { stdout: "", exitCode: null, timedOut: true }
        : { stdout: "{}", exitCode: 0, timedOut: false },
      pause: async (ms) => { delays.push(ms); },
    });
    expect(verdict.status).toBe("clean");
    expect(verdict.attempts[0]?.reason).toBe("audit_process_timeout");
    expect(delays).toEqual([2000]);
  });

  it.each(["", "[]", "null", '{"error":"unavailable"}', '{"package":[{}]}', "{}"])("never converts a failed response %s into clean", async (stdout) => {
    let calls = 0;
    const delays: number[] = [];
    const verdict = await auditDependencies({
      execute: async () => { calls += 1; return { stdout, exitCode: 1, timedOut: false }; },
      pause: async (ms) => { delays.push(ms); },
    });
    expect(calls).toBe(3);
    expect(delays).toEqual([2000, 5000]);
    expect(verdict.status).toBe("unavailable");
    expect(verdict.payload).toBeNull();
  });

  it("terminates a hung audit process", async () => {
    const result = await executeAudit(100, process.execPath, ["-e", "setInterval(() => {}, 1000)"]);
    expect(result.timedOut).toBe(true);
    expect(result.exitCode).not.toBe(0);
  });

  it("reports process launch failures without a fabricated result", async () => {
    const result = await executeAudit(100, "/does-not-exist/cornershop-audit");
    expect(result.exitCode).toBeNull();
    expect(result.stdout).toBe("");
  });
});
