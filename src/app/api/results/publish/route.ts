export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireRole, isErrorResponse } from "@/lib/roles";

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole("SUPER_ADMIN");
    if (isErrorResponse(user)) return user;

    const { jobId, action } = await request.json();

    if (!jobId || !["publish", "archive", "unpublish"].includes(action)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    if (action === "publish") {
      if (job.resultsPublished) {
        return NextResponse.json({ error: "Results already published" }, { status: 409 });
      }
      updateData.resultsPublished = true;
      updateData.resultsArchived = false;
      updateData.resultsPublishedAt = new Date();
    } else if (action === "archive") {
      if (!job.resultsPublished) {
        return NextResponse.json({ error: "Results must be published first" }, { status: 409 });
      }
      updateData.resultsArchived = true;
    } else if (action === "unpublish") {
      updateData.resultsPublished = false;
      updateData.resultsArchived = false;
      updateData.resultsPublishedAt = null;
    }

    const updated = await prisma.job.update({
      where: { id: jobId },
      data: updateData,
      select: {
        id: true,
        code: true,
        resultsPublished: true,
        resultsArchived: true,
        resultsPublishedAt: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        adminId: user.id,
        action: "RESULTS_STATUS_CHANGED",
        entity: "job",
        entityId: jobId,
        details: { action, ...updateData },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update results status:", error);
    return NextResponse.json({ error: "Failed to update results status" }, { status: 500 });
  }
}
