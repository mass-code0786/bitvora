ALTER TABLE "User" ADD COLUMN "countryName" TEXT;
ALTER TABLE "User" ADD COLUMN "countryCode" VARCHAR(2);
UPDATE "User" SET "countryName" = "country" WHERE "country" IS NOT NULL;
