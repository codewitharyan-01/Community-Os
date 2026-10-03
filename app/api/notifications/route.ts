import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

/** GET /api/notifications — polled by the bell for live updates. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ items: [], unread: 0 }, { status: 401 });

  const [items, unread] = await Promise.all([
    db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 15 }),
    db.notification.count({ where: { userId: user.id, read: false } }),
  ]);

  return NextResponse.json({
    unread,
    items: items.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      link: n.link,
      read: n.read,
      priority: n.priority,
      createdAt: n.createdAt.toISOString(),
    })),
  });
}

/** POST /api/notifications — { action: "markAll" } | { action: "markOne", id }. */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { action?: string; id?: string };

  if (body.action === "markAll") {
    await db.notification.updateMany({ where: { userId: user.id, read: false }, data: { read: true } });
  } else if (body.action === "markOne" && body.id) {
    await db.notification.updateMany({ where: { id: body.id, userId: user.id }, data: { read: true } });
  }
  return NextResponse.json({ ok: true });
}
