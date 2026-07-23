import { describe, expect, it } from "bun:test";
import {
  getImageStorageConfig,
  imageStorageIsConfigured,
} from "@/lib/storage/images";

describe("image storage configuration", () => {
  it("normalizes the public base URL", () => {
    expect(
      getImageStorageConfig({
        AWS_REGION: "us-west-1",
        S3_BUCKET: "restofront-images",
        S3_PUBLIC_BASE_URL: "https://assets.restofront.com/",
      }),
    ).toEqual({
      region: "us-west-1",
      bucket: "restofront-images",
      publicBaseUrl: "https://assets.restofront.com",
    });
  });

  it("requires every runtime value", () => {
    expect(imageStorageIsConfigured({ S3_BUCKET: "restofront-images" })).toBe(
      false,
    );
    expect(() =>
      getImageStorageConfig({ S3_BUCKET: "restofront-images" }),
    ).toThrow("S3_BUCKET, S3_PUBLIC_BASE_URL, and AWS_REGION");
  });
});
