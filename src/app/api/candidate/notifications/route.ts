export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { ROLES, requireRole, isErrorResponse } from "@/lib/roles";

export async function GET() {
  try {
    const user = await requireRole(ROLES.CANDIDATE);
    if (isErrorResponse(user)) return user;

    const candidateId = user.id;

    const notifications = await prisma.notification.findMany({
      where: { candidateId },
      orderBy: { sentAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("Failed to fetch notifications:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}
