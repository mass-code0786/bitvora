CREATE TYPE "BannerStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE', 'EXPIRED');

CREATE TABLE "Banner" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "imagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "status" "BannerStatus" NOT NULL DEFAULT 'DRAFT',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdByAdminId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Banner_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BannerAuditLog" (
    "id" TEXT NOT NULL,
    "bannerId" TEXT,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BannerAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Banner_isActive_startsAt_expiresAt_idx" ON "Banner"("isActive", "startsAt", "expiresAt");
CREATE INDEX "Banner_createdAt_idx" ON "Banner"("createdAt");
CREATE INDEX "BannerAuditLog_bannerId_createdAt_idx" ON "BannerAuditLog"("bannerId", "createdAt");
CREATE INDEX "BannerAuditLog_adminId_createdAt_idx" ON "BannerAuditLog"("adminId", "createdAt");
ALTER TABLE "Banner" ADD CONSTRAINT "Banner_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BannerAuditLog" ADD CONSTRAINT "BannerAuditLog_bannerId_fkey" FOREIGN KEY ("bannerId") REFERENCES "Banner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BannerAuditLog" ADD CONSTRAINT "BannerAuditLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
