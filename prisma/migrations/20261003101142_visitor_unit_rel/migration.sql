-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Visitor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "communityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "vehicleNumber" TEXT NOT NULL DEFAULT '',
    "purpose" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL DEFAULT 'GUEST',
    "hostUserId" TEXT,
    "unitId" TEXT,
    "passCode" TEXT NOT NULL,
    "validFrom" DATETIME NOT NULL,
    "validTo" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'EXPECTED',
    "checkedInAt" DATETIME,
    "checkedOutAt" DATETIME,
    "checkedInBy" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Visitor_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Visitor_hostUserId_fkey" FOREIGN KEY ("hostUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Visitor_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Visitor" ("checkedInAt", "checkedInBy", "checkedOutAt", "communityId", "createdAt", "hostUserId", "id", "name", "notes", "passCode", "phone", "purpose", "status", "type", "unitId", "validFrom", "validTo", "vehicleNumber") SELECT "checkedInAt", "checkedInBy", "checkedOutAt", "communityId", "createdAt", "hostUserId", "id", "name", "notes", "passCode", "phone", "purpose", "status", "type", "unitId", "validFrom", "validTo", "vehicleNumber" FROM "Visitor";
DROP TABLE "Visitor";
ALTER TABLE "new_Visitor" RENAME TO "Visitor";
CREATE UNIQUE INDEX "Visitor_passCode_key" ON "Visitor"("passCode");
CREATE INDEX "Visitor_communityId_status_idx" ON "Visitor"("communityId", "status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
