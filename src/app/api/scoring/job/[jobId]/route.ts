export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requirePermission, isErrorResponse } from "@/lib/roles";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const user = await requirePermission("manageJobs");
    if (isErrorResponse(user)) return user;

    const { jobId } = await params;

    const criteriaIds = await prisma.scoredCriteria.findMany({
      where: { jobId },
      select: { id: true },
    });

    await prisma.score.deleteMany({
      where: { criteriaId: { in: criteriaIds.map(c => c.id) } },
    });

    await prisma.scoredCriteria.deleteMany({ where: { jobId } });

    return NextResponse.json({ message: "Scoring data deleted" });
  } catch (error) {
    console.error("Failed to delete scoring data:", error);
    return NextResponse.json({ error: "Failed to delete scoring data" }, { status: 500 });
  }
}
