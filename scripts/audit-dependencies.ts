import { execFile } from "node:child_process";

type AuditPayload = Record<string, Array<Record<string, unknown>>>;
type AttemptResult = {
  stdout: string;
  exitCode: number | null;
  timedOut: boolean;
};
type AuditAttempt = {
  attempt: number;
  outcome: "clean" | "advisories" | "unavailable";
  reason: string;
};
export type DependencyAuditVerdict = {
  schemaVersion: 1;
  status: AuditAttempt["outcome"];
  attempts: AuditAttempt[];
  advisoryCount: number;
  payload: AuditPayload | null;
};

const ATTEMPT_TIMEOUT_MS = 60_000;
const RETRY_DELAYS_MS = [2_000, 5_000];

export function executeAudit(
  timeoutMs = ATTEMPT_TIMEOUT_MS,
  executable = process.execPath,
  args = ["audit", "--json"],
): Promise<AttemptResult> {
  return new Promise((resolve) => {
    execFile(executable, args, {
      timeout: timeoutMs,
      killSignal: "SIGKILL",
      maxBuffer: 8 * 1024 * 1024,
      encoding: "utf8",
    }, (error, stdout) => {
      resolve({
        stdout,
        exitCode: error ? (typeof error.code === "number" ? error.code : null) : 0,
        timedOut: error?.killed === true,
      });
    });
  });
}

function parsePayload(source: string): AuditPayload | null {
  try {
    const value: unknown = JSON.parse(source);
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const payload: AuditPayload = {};
    for (const [name, advisories] of Object.entries(value)) {
      if (!Array.isArray(advisories) || advisories.length === 0) return null;
      const validated: Array<Record<string, unknown>> = [];
      for (const advisory of advisories) {
        if (!advisory || typeof advisory !== "object" || Array.isArray(advisory)) return null;
        if (!("title" in advisory) || typeof advisory.title !== "string") return null;
        validated.push(advisory);
      }
      payload[name] = validated;
    }
    return payload;
  } catch {
    return null;
  }
}

export async function auditDependencies(options: {
  execute?: () => Promise<AttemptResult>;
  pause?: (milliseconds: number) => Promise<void>;
} = {}): Promise<DependencyAuditVerdict> {
  const execute = options.execute ?? executeAudit;
  const pause = options.pause ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const attempts: AuditAttempt[] = [];
  for (let index = 0; index <= RETRY_DELAYS_MS.length; index += 1) {
    let result: AttemptResult;
    try {
      result = await execute();
    } catch {
      result = { stdout: "", exitCode: null, timedOut: false };
    }
    const payload = parsePayload(result.stdout);
    const count = payload ? Object.values(payload).reduce((total, entries) => total + entries.length, 0) : 0;
    // Report discovered vulnerabilities even if the process exits unexpectedly.
    // Only a complete successful empty response can establish a clean graph.
    const status = count > 0 ? "advisories"
      : payload && result.exitCode === 0 && !result.timedOut ? "clean"
        : "unavailable";
    attempts.push({
      attempt: index + 1,
      outcome: status,
      reason: status === "advisories" ? "locked_graph_vulnerabilities"
        : status === "clean" ? "complete_locked_graph_clean"
          : result.timedOut ? "audit_process_timeout"
            : payload ? "audit_process_failed"
              : "missing_or_invalid_audit_response",
    });
    if (status !== "unavailable") {
      return { schemaVersion: 1, status, attempts, advisoryCount: count, payload };
    }
    const delay = RETRY_DELAYS_MS[index];
    if (delay !== undefined) await pause(delay);
  }
  return { schemaVersion: 1, status: "unavailable", attempts, advisoryCount: 0, payload: null };
}

if (import.meta.main) {
  const verdict = await auditDependencies();
  await Bun.write("bun-audit.json", `${JSON.stringify(verdict.payload, null, 2)}\n`);
  const summary = { schemaVersion: verdict.schemaVersion, status: verdict.status, attempts: verdict.attempts, advisoryCount: verdict.advisoryCount };
  await Bun.write("bun-audit-verdict.json", `${JSON.stringify(summary, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(summary)}\n`);
  if (verdict.status === "unavailable") {
    process.stderr.write("Dependency audit unavailable after three bounded attempts; no vulnerability verdict was obtained. Inspect bun-audit-verdict.json and retry when registry transport is available.\n");
  }
  process.exitCode = verdict.status === "clean" ? 0 : verdict.status === "advisories" ? 1 : 2;
}
