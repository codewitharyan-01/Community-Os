-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "communityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'EVENT',
    "description" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME,
    "budget" INTEGER NOT NULL DEFAULT 0,
    "rsvpEnabled" BOOLEAN NOT NULL DEFAULT true,
    "volunteerSlots" INTEGER NOT NULL DEFAULT 0,
    "agenda" TEXT NOT NULL DEFAULT '',
    "minutes" TEXT NOT NULL DEFAULT '',
    "cancelled" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Event_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Event" ("agenda", "budget", "communityId", "createdAt", "createdByUserId", "description", "endsAt", "id", "location", "minutes", "rsvpEnabled", "startsAt", "title", "type", "volunteerSlots") SELECT "agenda", "budget", "communityId", "createdAt", "createdByUserId", "description", "endsAt", "id", "location", "minutes", "rsvpEnabled", "startsAt", "title", "type", "volunteerSlots" FROM "Event";
DROP TABLE "Event";
ALTER TABLE "new_Event" RENAME TO "Event";
CREATE INDEX "Event_communityId_startsAt_idx" ON "Event"("communityId", "startsAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
