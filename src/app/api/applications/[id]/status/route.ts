export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { prisma } from "@/server/prisma";
import { z } from "zod";

const statusUpdateSchema = z.object({
  status: z.enum(["DRAFT", "PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED", "ORAL_TEST", "FINAL_LIST"]),
  note: z.string().optional(),
  candidateId: z.string().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "REVIEWER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, note } = statusUpdateSchema.parse(body);

    const application = await prisma.application.update({
      where: { id },
      data: {
        status,
        reviewedAt: new Date(),
        reviewedBy: session.user.id,
      },
    });

    await prisma.statusHistory.create({
      data: {
        applicationId: id,
        status,
        note: note || null,
        changedBy: session.user.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        adminId: session.user.id,
        action: "APPLICATION_STATUS_CHANGED",
        entity: "application",
        entityId: id,
        details: { status, note },
      },
    });

    return NextResponse.json(application);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    console.error("Failed to update status:", error);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}
