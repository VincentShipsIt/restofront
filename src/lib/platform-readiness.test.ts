import { describe, expect, it, mock } from "bun:test";
import {
  checkPlatformReadiness,
  createCachedPlatformReadiness,
  isPlatformReadinessAuthorized,
  type PlatformReadiness,
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
    const serviceProbes = probes();
    const result = await checkPlatformReadiness(
      configuredEnvironment,
      serviceProbes,
    );

    expect(result.status).toBe("ready");
    expect(result.services.every((service) => service.status === "ready")).toBe(
      true,
    );
    expect(serviceProbes.database).toHaveBeenCalledTimes(1);
    expect(serviceProbes.rateLimit).toHaveBeenCalledTimes(1);
    expect(serviceProbes.blob).toHaveBeenCalledTimes(1);
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

  it("reports an unavailable blob store without exposing provider errors", async () => {
    const serviceProbes = probes();
    serviceProbes.blob = mock(async () => {
      throw new Error(
        `blob failed with ${configuredEnvironment.BLOB_READ_WRITE_TOKEN}`,
      );
    });

    const result = await checkPlatformReadiness(
      configuredEnvironment,
      serviceProbes,
    );
    const blob = result.services.find((service) => service.service === "blob");

    expect(blob).toEqual({
      service: "blob",
      status: "unavailable",
      message:
        "Configured but unreachable. Check provider status and credentials.",
    });
    expect(JSON.stringify(result)).not.toContain(
      configuredEnvironment.BLOB_READ_WRITE_TOKEN,
    );
  });
});

describe("platform readiness endpoint protection", () => {
  it("fails closed without a configured token", () => {
    const request = new Request("https://restofront.example/api/health/ready", {
      headers: { Authorization: "Bearer supplied-token" },
    });

    expect(isPlatformReadinessAuthorized(request, "")).toBe(false);
  });

  it("accepts only the configured bearer token", () => {
    const authorized = new Request(
      "https://restofront.example/api/health/ready",
      {
        headers: { Authorization: "Bearer expected-token" },
      },
    );
    const unauthorized = new Request(
      "https://restofront.example/api/health/ready",
      {
        headers: { Authorization: "Bearer different-token" },
      },
    );

    expect(isPlatformReadinessAuthorized(authorized, "expected-token")).toBe(
      true,
    );
    expect(isPlatformReadinessAuthorized(unauthorized, "expected-token")).toBe(
      false,
    );
  });

  it("deduplicates concurrent probes and caches their result briefly", async () => {
    let currentTime = 1_000;
    const readiness: PlatformReadiness = {
      status: "ready",
      environment: "preview",
      services: [],
    };
    const check = mock(async () => readiness);
    const getReadiness = createCachedPlatformReadiness({
      check,
      now: () => currentTime,
      ttlMs: 5_000,
    });

    const [first, second] = await Promise.all([
      getReadiness(),
      getReadiness(),
    ]);
    const cached = await getReadiness();

    expect(first).toBe(readiness);
    expect(second).toBe(readiness);
    expect(cached).toBe(readiness);
    expect(check).toHaveBeenCalledTimes(1);

    currentTime += 5_001;
    await getReadiness();
    expect(check).toHaveBeenCalledTimes(2);
  });
});
