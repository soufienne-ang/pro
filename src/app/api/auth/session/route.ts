export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/server/auth";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({ user: session.user });
}