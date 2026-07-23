import { Redis } from "@upstash/redis";
import { list } from "@vercel/blob";
import { getDb } from "@/lib/db";

export type PlatformService = "database" | "rateLimit" | "blob";
export type PlatformServiceStatus =
  | "ready"
  | "misconfigured"
  | "unavailable";

type Environment = Record<string, string | undefined>;

export type ReadinessProbe = () => Promise<void>;

export type ReadinessProbes = Record<PlatformService, ReadinessProbe>;

export type ServiceReadiness = {
  service: PlatformService;
  status: PlatformServiceStatus;
  message: string;
};

export type PlatformReadiness = {
  status: "ready" | "not_ready";
  environment: "development" | "preview" | "production";
  services: ServiceReadiness[];
};

const probeTimeoutMs = 5_000;

function deploymentEnvironment(
  env: Environment,
): PlatformReadiness["environment"] {
  if (env.VERCEL_ENV === "preview") return "preview";
  if (env.VERCEL_ENV === "production") return "production";
  if (env.NODE_ENV === "production") return "production";
  return "development";
}

function isDeployedEnvironment(
  environment: PlatformReadiness["environment"],
) {
  return environment === "preview" || environment === "production";
}

function validateDatabase(
  env: Environment,
  environment: PlatformReadiness["environment"],
): ServiceReadiness | null {
  const value = env.DATABASE_URL;
  if (!value) {
    return {
      service: "database",
      status: "misconfigured",
      message: "Set DATABASE_URL for this deployment environment.",
    };
  }

  try {
    const url = new URL(value);
    if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
      throw new Error("unsupported protocol");
    }
    if (
      isDeployedEnvironment(environment) &&
      ["localhost", "127.0.0.1", "::1"].includes(url.hostname)
    ) {
      return {
        service: "database",
        status: "misconfigured",
        message: "DATABASE_URL must use a managed host in deployed environments.",
      };
    }
  } catch {
    return {
      service: "database",
      status: "misconfigured",
      message: "DATABASE_URL must be a valid PostgreSQL connection URL.",
    };
  }

  return null;
}

function validateRateLimit(env: Environment): ServiceReadiness | null {
  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return {
      service: "rateLimit",
      status: "misconfigured",
      message:
        "Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN for this deployment environment.",
    };
  }

  try {
    if (new URL(url).protocol !== "https:") throw new Error("not HTTPS");
  } catch {
    return {
      service: "rateLimit",
      status: "misconfigured",
      message: "UPSTASH_REDIS_REST_URL must be a valid HTTPS URL.",
    };
  }

  return null;
}

function validateBlob(env: Environment): ServiceReadiness | null {
  if (!env.BLOB_READ_WRITE_TOKEN) {
    return {
      service: "blob",
      status: "misconfigured",
      message: "Set BLOB_READ_WRITE_TOKEN for this deployment environment.",
    };
  }
  return null;
}

function configurationError(
  service: PlatformService,
  env: Environment,
  environment: PlatformReadiness["environment"],
) {
  if (service === "database") return validateDatabase(env, environment);
  if (service === "rateLimit") return validateRateLimit(env);
  return validateBlob(env);
}

function createDefaultProbes(env: Environment): ReadinessProbes {
  return {
    database: async () => {
      await getDb().$queryRawUnsafe("SELECT 1");
    },
    rateLimit: async () => {
      const redis = new Redis({
        url: env.UPSTASH_REDIS_REST_URL,
        token: env.UPSTASH_REDIS_REST_TOKEN,
      });
      const response = await redis.ping();
      if (response !== "PONG") throw new Error("Redis ping failed");
    },
    blob: async () => {
      await list({ limit: 1, token: env.BLOB_READ_WRITE_TOKEN });
    },
  };
}

async function withTimeout(probe: ReadinessProbe) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      probe(),
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(
          () => reject(new Error("Platform readiness probe timed out")),
          probeTimeoutMs,
        );
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function checkPlatformReadiness(
  env: Environment = process.env,
  probes: ReadinessProbes = createDefaultProbes(env),
): Promise<PlatformReadiness> {
  const environment = deploymentEnvironment(env);
  const services = await Promise.all(
    (["database", "rateLimit", "blob"] satisfies PlatformService[]).map(
      async (service): Promise<ServiceReadiness> => {
        const error = configurationError(service, env, environment);
        if (error) return error;

        try {
          await withTimeout(probes[service]);
          return {
            service,
            status: "ready",
            message: "Configured and reachable.",
          };
        } catch {
          return {
            service,
            status: "unavailable",
            message:
              "Configured but unreachable. Check provider status and credentials.",
          };
        }
      },
    ),
  );

  return {
    status: services.every((service) => service.status === "ready")
      ? "ready"
      : "not_ready",
    environment,
    services,
  };
}
