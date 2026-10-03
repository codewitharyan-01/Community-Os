-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Issue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "communityId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "adminBoost" INTEGER NOT NULL DEFAULT 0,
    "upvoteCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "attachmentPath" TEXT NOT NULL DEFAULT '',
    "assignedToUserId" TEXT,
    "assignedVendorId" TEXT,
    "slaHours" INTEGER NOT NULL DEFAULT 24,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    CONSTRAINT "Issue_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Issue_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Issue_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Issue_assignedVendorId_fkey" FOREIGN KEY ("assignedVendorId") REFERENCES "Vendor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Issue" ("adminBoost", "assignedToUserId", "assignedVendorId", "attachmentPath", "authorId", "category", "commentCount", "communityId", "createdAt", "description", "id", "location", "resolvedAt", "severity", "slaHours", "status", "title", "upvoteCount") SELECT "adminBoost", "assignedToUserId", "assignedVendorId", "attachmentPath", "authorId", "category", "commentCount", "communityId", "createdAt", "description", "id", "location", "resolvedAt", "severity", "slaHours", "status", "title", "upvoteCount" FROM "Issue";
DROP TABLE "Issue";
ALTER TABLE "new_Issue" RENAME TO "Issue";
CREATE INDEX "Issue_communityId_status_idx" ON "Issue"("communityId", "status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
