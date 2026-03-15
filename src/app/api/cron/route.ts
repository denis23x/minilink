import { NextResponse } from "next/server";

import { deleteExpiredLinks } from "~/server/api/link";
import { deleteExpiredUserLinks } from "~/server/api/user-link";

export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!authHeader || authHeader !== expected) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await deleteExpiredLinks();
  await deleteExpiredUserLinks();

  return NextResponse.json({ message: "Cleanup complete" });
}
