ALTER TABLE "Restaurant"
ADD COLUMN "sourceKey" TEXT;

ALTER TABLE "ImportJob"
ADD COLUMN "sourceKey" TEXT;

CREATE UNIQUE INDEX "Restaurant_sourceKey_key"
ON "Restaurant"("sourceKey");

CREATE INDEX "ImportJob_sourceKey_createdAt_idx"
ON "ImportJob"("sourceKey", "createdAt");
