ALTER TABLE "Banner" ADD COLUMN "uploadKey" TEXT;
CREATE UNIQUE INDEX "Banner_uploadKey_key" ON "Banner"("uploadKey");
