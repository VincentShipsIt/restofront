import { createClient } from "redis";

let redisClient: ReturnType<typeof createClient> | undefined;
let redisConnection: Promise<ReturnType<typeof createClient>> | undefined;

export async function getRedisClient() {
  if (!redisClient) {
    const url = process.env.REDIS_URL;
    if (!url) throw new Error("REDIS_URL is not configured");

    redisClient = createClient({
      url,
      socket: {
        connectTimeout: 5_000,
        reconnectStrategy: (retries) => Math.min(retries * 100, 2_000),
      },
    });
    redisClient.on("error", () => {
      // Individual operations report their own bounded failure to callers.
    });
  }

  if (!redisClient.isOpen) {
    redisConnection ??= redisClient
      .connect()
      .then(() => redisClient!)
      .catch((error) => {
        redisConnection = undefined;
        throw error;
      });
    await redisConnection;
  }

  return redisClient;
}
