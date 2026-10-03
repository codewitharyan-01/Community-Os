"use server";

import { db } from "@/lib/db";
import { requireCommunityUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { humanize } from "@/lib/utils";

export type SearchGroup = {
  label: string;
  items: { id: string; title: string; subtitle: string; href: string }[];
};

/** Multi-word AND search helper: every term must match at least one field. */
function matchTerms(terms: string[], fields: string[]): boolean {
  const hay = fields.join(" ").toLowerCase();
  return terms.every((t) => hay.includes(t));
}

/** Global, permission-scoped search for the command palette. */
export async function globalSearch(query: string): Promise<SearchGroup[]> {
  const user = await requireCommunityUser();
  const communityId = user.communityId;
  if (!communityId) return [];

  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const terms = q.split(/\s+/).slice(0, 4);
  const raw = query.trim();
  const groups: SearchGroup[] = [];
  const residentView = !can(user.role, "residents.view");

  // Residents + units + vehicles (admin only)
  if (can(user.role, "residents.view")) {
    const users = await db.user.findMany({
      where: { communityId, active: true, role: { in: ["OWNER", "TENANT", "FAMILY_MEMBER"] } },
      take: 400,
      include: { memberships: { include: { unit: true } } },
    });
    const hits = users
      .filter((u) =>
        matchTerms(terms, [
          u.name, u.email, u.phone,
          u.memberships.map((m) => m.unit.label).join(" "),
        ])
      )
      .slice(0, 5);
    if (hits.length) {
      groups.push({
        label: "Residents",
        items: hits.map((u) => ({
          id: u.id,
          title: u.name,
          subtitle: u.memberships.map((m) => m.unit.label).join(", ") || u.email,
          href: "/admin/residents",
        })),
      });
    }

    const unitRows = await db.unit.findMany({ where: { communityId }, take: 400, include: { building: true } });
    const unitHits = unitRows.filter((u) => matchTerms(terms, [u.label, u.building.name])).slice(0, 4);
    if (unitHits.length) {
      groups.push({
        label: "Units",
        items: unitHits.map((u) => ({ id: u.id, title: u.label, subtitle: u.building.name, href: "/admin/residents" })),
      });
    }

    const vehicles = await db.vehicle.findMany({ where: { communityId }, take: 400, include: { unit: true } });
    const vehHits = vehicles.filter((v) => matchTerms(terms, [v.number, v.model])).slice(0, 4);
    if (vehHits.length) {
      groups.push({
        label: "Vehicles",
        items: vehHits.map((v) => ({ id: v.id, title: v.number, subtitle: v.unit?.label ?? "Unassigned", href: "/admin/security?tab=vehicles" })),
      });
    }
  }

  // Issues (admins + staff; residents get their own below)
  if (can(user.role, "issues.view.all")) {
    const issues = await db.issue.findMany({
      where: { communityId, OR: [{ title: { contains: raw } }, { description: { contains: raw } }] },
      take: 10,
      orderBy: { createdAt: "desc" },
    });
    if (issues.length) {
      groups.push({
        label: "Issues",
        items: issues.slice(0, 4).map((i) => ({
          id: i.id,
          title: i.title,
          subtitle: humanize(i.status),
          href: "/admin/issues",
        })),
      });
    }
  }

  // Invoices
  if (can(user.role, "finance.view")) {
    const invoices = await db.invoice.findMany({
      where: { communityId, number: { contains: q } },
      take: 4,
      include: { unit: true },
    });
    if (invoices.length) {
      groups.push({
        label: "Invoices",
        items: invoices.map((i) => ({ id: i.id, title: i.number, subtitle: `${i.unit.label} · ${humanize(i.status)}`, href: "/admin/finance?tab=invoices" })),
      });
    }
  }

  // Vendors
  if (can(user.role, "vendors.manage")) {
    const vendors = await db.vendor.findMany({ where: { communityId, company: { contains: q } }, take: 4 });
    if (vendors.length) {
      groups.push({
        label: "Vendors",
        items: vendors.map((v) => ({ id: v.id, title: v.company, subtitle: humanize(v.category), href: "/admin/vendors" })),
      });
    }
  }

  // Documents
  if (can(user.role, "documents.view.all")) {
    const docs = await db.document.findMany({ where: { communityId, title: { contains: q } }, take: 4 });
    if (docs.length) {
      groups.push({
        label: "Documents",
        items: docs.map((d) => ({ id: d.id, title: d.title, subtitle: humanize(d.category), href: "/admin/documents" })),
      });
    }
  }

  // Events (admin)
  if (can(user.role, "community.event.create")) {
    const events = await db.event.findMany({ where: { communityId, title: { contains: raw } }, take: 4, orderBy: { startsAt: "desc" } });
    if (events.length) {
      groups.push({
        label: "Events",
        items: events.map((e) => ({ id: e.id, title: e.title, subtitle: humanize(e.type), href: "/admin/community?tab=events" })),
      });
    }
  }

  // Resident scope: own issues + own visitors
  if (residentView) {
    const myIssues = await db.issue.findMany({
      where: { authorId: user.id, OR: [{ title: { contains: raw } }, { description: { contains: raw } }] },
      take: 4,
      orderBy: { createdAt: "desc" },
    });
    if (myIssues.length) {
      groups.push({
        label: "My issues",
        items: myIssues.map((i) => ({ id: i.id, title: i.title, subtitle: humanize(i.status), href: `/resident/services/issues/${i.id}` })),
      });
    }
    const myVisitors = await db.visitor.findMany({
      where: { hostUserId: user.id, name: { contains: raw } },
      take: 4,
    });
    if (myVisitors.length) {
      groups.push({
        label: "My visitors",
        items: myVisitors.map((v) => ({ id: v.id, title: v.name, subtitle: `Pass ${v.passCode} · ${humanize(v.status)}`, href: "/resident/services/visitors" })),
      });
    }
  }

  return groups;
}
