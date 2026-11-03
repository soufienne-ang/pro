export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requirePermission, isErrorResponse } from "@/lib/roles";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission("scheduleExams");
    if (isErrorResponse(user)) return user;

    const { id } = await params;
    const body = await request.json();

    const data: Record<string, unknown> = {};
    if (body.date) data.date = new Date(body.date);
    if (body.endDate !== undefined) data.endDate = body.endDate ? new Date(body.endDate) : null;
    if (body.startTime) data.startTime = body.startTime;
    if (body.endTime) data.endTime = body.endTime;
    if (body.roomId !== undefined) data.roomId = body.roomId || null;
    if (body.name !== undefined) data.name = body.name || null;
    if (body.type) data.type = body.type;

    const updated = await prisma.examSession.update({
      where: { id },
      data,
    });

    await prisma.auditLog.create({
      data: {
        adminId: user.id,
        action: "SESSION_UPDATED",
        entity: "ExamSession",
        entityId: id,
        details: body,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update session:", error);
    return NextResponse.json({ error: "Failed to update session" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission("scheduleExams");
    if (isErrorResponse(user)) return user;

    const { id } = await params;

    const existing = await prisma.examSession.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    await prisma.examSession.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        adminId: user.id,
        action: "SESSION_DELETED",
        entity: "ExamSession",
        entityId: id,
      },
    });

    return NextResponse.json({ message: "Session deleted" });
  } catch (error) {
    console.error("Failed to delete session:", error);
    return NextResponse.json({ error: "Failed to delete session" }, { status: 500 });
  }
}
