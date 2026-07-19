CREATE TYPE "ImageProvenance" AS ENUM ('OFFICIAL', 'OWNER', 'PERMISSIONED_UGC');

ALTER TABLE "Restaurant"
ADD COLUMN "heroOriginalImageUrl" TEXT,
ADD COLUMN "heroImageProvenance" "ImageProvenance",
ADD COLUMN "autoEnhanceImages" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "MenuItem"
ADD COLUMN "originalImageUrl" TEXT,
ADD COLUMN "imageProvenance" "ImageProvenance";
