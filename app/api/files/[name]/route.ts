import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { getSessionUser } from "@/lib/auth";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

/** Serves uploaded files from ./uploads with session checks. Filenames are server-generated. */
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const user = await getSessionUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { name } = await params;
  // Only allow server-generated names: alphanumerics, dashes, single dot+ext
  if (!/^[a-zA-Z0-9-]+\.[a-z0-9]{2,5}$/.test(name)) {
    return new NextResponse("Invalid file name", { status: 400 });
  }

  try {
    const filePath = path.join(process.cwd(), "uploads", name);
    const data = await readFile(filePath);
    const ext = path.extname(name).toLowerCase();
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": MIME[ext] ?? "application/octet-stream",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    // Seeded demo documents have no physical file — explain gracefully.
    return new NextResponse(
      "This seeded demo document has no physical file. Upload a real file to see it served.",
      { status: 404 }
    );
  }
}
