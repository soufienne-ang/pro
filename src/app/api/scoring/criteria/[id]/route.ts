export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { z } from "zod";
import { requirePermission, isErrorResponse } from "@/lib/roles";

const updateCriteriaSchema = z.object({
  name: z.string().min(1).optional(),
  weight: z.number().positive().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission("manageScoringCriteria");
    if (isErrorResponse(user)) return user;

    const { id } = await params;
    const body = await request.json();
    const data = updateCriteriaSchema.parse(body);

    const criteria = await prisma.scoredCriteria.update({
      where: { id },
      data,
    });

    await prisma.auditLog.create({
      data: {
        adminId: user.id,
        action: "CRITERIA_UPDATED",
        entity: "scored_criteria",
        entityId: id,
        details: data,
      },
    });

    return NextResponse.json(criteria);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Failed to update criteria:", error);
    return NextResponse.json({ error: "Failed to update criteria" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission("manageScoringCriteria");
    if (isErrorResponse(user)) return user;

    const { id } = await params;

    await prisma.scoredCriteria.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        adminId: user.id,
        action: "CRITERIA_DELETED",
        entity: "scored_criteria",
        entityId: id,
      },
    });

    return NextResponse.json({ message: "Criteria deleted" });
  } catch (error) {
    console.error("Failed to delete criteria:", error);
    return NextResponse.json({ error: "Failed to delete criteria" }, { status: 500 });
  }
}
