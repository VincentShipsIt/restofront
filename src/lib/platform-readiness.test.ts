import { describe, expect, it, mock } from "bun:test";
import {
  checkPlatformReadiness,
  type ReadinessProbes,
} from "@/lib/platform-readiness";

const configuredEnvironment = {
  VERCEL_ENV: "preview",
  DATABASE_URL: "postgresql://preview.example.test/restofront",
  UPSTASH_REDIS_REST_URL: "https://redis.example.test",
  UPSTASH_REDIS_REST_TOKEN: "redis-secret",
  BLOB_READ_WRITE_TOKEN: "blob-secret",
};

function probes(): ReadinessProbes {
  return {
    database: mock(async () => {}),
    rateLimit: mock(async () => {}),
    blob: mock(async () => {}),
  };
}

describe("checkPlatformReadiness", () => {
  it("reports every missing service without running probes", async () => {
    const serviceProbes = probes();
    const result = await checkPlatformReadiness(
      { VERCEL_ENV: "production" },
      serviceProbes,
    );

    expect(result.status).toBe("not_ready");
    expect(result.environment).toBe("production");
    expect(result.services).toEqual([
      {
        service: "database",
        status: "misconfigured",
        message: "Set DATABASE_URL for this deployment environment.",
      },
      {
        service: "rateLimit",
        status: "misconfigured",
        message:
          "Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN for this deployment environment.",
      },
      {
        service: "blob",
        status: "misconfigured",
        message: "Set BLOB_READ_WRITE_TOKEN for this deployment environment.",
      },
    ]);
    expect(serviceProbes.database).not.toHaveBeenCalled();
    expect(serviceProbes.rateLimit).not.toHaveBeenCalled();
    expect(serviceProbes.blob).not.toHaveBeenCalled();
  });

  it("reports configured and reachable services as ready", async () => {
    const result = await checkPlatformReadiness(
      configuredEnvironment,
      probes(),
    );

    expect(result.status).toBe("ready");
    expect(result.services.every((service) => service.status === "ready")).toBe(
      true,
    );
  });

  it("fails deployed environments that point at a local database", async () => {
    const serviceProbes = probes();
    const result = await checkPlatformReadiness(
      {
        ...configuredEnvironment,
        DATABASE_URL: "postgresql://localhost:5432/restofront",
      },
      serviceProbes,
    );

    expect(result.status).toBe("not_ready");
    expect(result.services[0]).toEqual({
      service: "database",
      status: "misconfigured",
      message: "DATABASE_URL must use a managed host in deployed environments.",
    });
    expect(serviceProbes.database).not.toHaveBeenCalled();
  });

  it("does not expose provider errors or credential values", async () => {
    const serviceProbes = probes();
    serviceProbes.rateLimit = mock(async () => {
      throw new Error(`request failed with ${configuredEnvironment.UPSTASH_REDIS_REST_TOKEN}`);
    });

    const result = await checkPlatformReadiness(
      configuredEnvironment,
      serviceProbes,
    );
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("not_ready");
    expect(result.services[1]).toEqual({
      service: "rateLimit",
      status: "unavailable",
      message:
        "Configured but unreachable. Check provider status and credentials.",
    });
    expect(serialized).not.toContain(
      configuredEnvironment.UPSTASH_REDIS_REST_TOKEN,
    );
    expect(serialized).not.toContain(configuredEnvironment.BLOB_READ_WRITE_TOKEN);
    expect(serialized).not.toContain(configuredEnvironment.DATABASE_URL);
  });
});
