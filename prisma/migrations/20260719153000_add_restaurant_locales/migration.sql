ALTER TABLE "Restaurant"
ADD COLUMN "defaultLocale" TEXT NOT NULL DEFAULT 'en',
ADD COLUMN "translations" JSONB NOT NULL DEFAULT '[]';
