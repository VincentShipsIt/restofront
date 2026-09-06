import { describe, expect, it } from "bun:test";
import { auditDependencies, executeAudit } from "../../scripts/audit-dependencies";

describe("bounded dependency audit", () => {
  it("accepts only a successful complete empty graph as clean", async () => {
    const verdict = await auditDependencies({ execute: async () => ({ stdout: "{}", exitCode: 0, stderr: "", timedOut: false }) });
    expect(verdict.status).toBe("clean");
    expect(verdict.attempts).toHaveLength(1);
  });

  it.each([0, 1])("preserves every advisory and fails even when audit exits %i", async (exitCode) => {
    const payload = { package: [{ title: "low advisory", severity: "low" }, { title: "critical advisory", severity: "critical" }] };
    const verdict = await auditDependencies({ execute: async () => ({ stdout: JSON.stringify(payload), exitCode, stderr: "", timedOut: false }) });
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
        ? { stdout: "", exitCode: null, stderr: "", timedOut: true }
        : { stdout: "{}", exitCode: 0, stderr: "", timedOut: false },
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
      execute: async () => { calls += 1; return { stdout, exitCode: 1, stderr: "", timedOut: false }; },
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

  it("preserves failed and malformed output after a successful retry", async () => {
    const failed = { stdout: "{truncated advisory", stderr: "registry returned 503", exitCode: 1, timedOut: false };
    const clean = { stdout: "{}\n", stderr: "", exitCode: 0, timedOut: false };
    let calls = 0;
    const verdict = await auditDependencies({ execute: async () => calls++ === 0 ? failed : clean, pause: async () => {} });
    expect(verdict.status).toBe("clean");
    expect(verdict.rawAttempts).toEqual([failed, clean]);
  });

  it("captures both process streams even when audit fails", async () => {
    const result = await executeAudit(1000, process.execPath, ["-e", 'process.stdout.write("invalid json"); process.stderr.write("registry unavailable"); process.exitCode = 2']);
    expect(result).toEqual({ stdout: "invalid json", stderr: "registry unavailable", exitCode: 2, timedOut: false });
  });

  it("fails closed when the installed Bun audit receives a registry outage", async () => {
    let requests = 0;
    const server = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch: () => {
      requests += 1;
      return Response.json({ error: "fixture registry unavailable" }, { status: 503 });
    } });
    try {
      const verdict = await auditDependencies({
        execute: () => executeAudit(3000, "/usr/bin/env", [`npm_config_registry=${server.url.href}`, process.execPath, "audit", "--json"]),
        pause: async () => {},
      });
      expect(requests).toBe(3);
      expect(verdict.status).toBe("unavailable");
      expect(verdict.attempts).toHaveLength(3);
      expect(verdict.rawAttempts.every((attempt) => attempt.exitCode !== 0 && attempt.stderr.includes("503"))).toBe(true);
    } finally {
      server.stop(true);
    }
  });

  it("reports process launch failures without a fabricated result", async () => {
    const result = await executeAudit(100, "/does-not-exist/cornershop-audit");
    expect(result.exitCode).toBeNull();
    expect(result.stdout).toBe("");
  });
});
