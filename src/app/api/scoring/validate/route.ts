export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { requirePermission, isErrorResponse } from "@/lib/roles";

const validateSchema = z.object({
  jobId: z.string(),
  applicationIds: z.array(z.string()).optional(),
  finalList: z.boolean().optional().default(true),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission("validateResults");
    if (isErrorResponse(user)) return user;

    const body = await request.json();
    const { jobId, applicationIds, finalList } = validateSchema.parse(body);

    const where: { jobId: string; id?: { in: string[] } } = { jobId };
    if (applicationIds && applicationIds.length > 0) {
      where.id = { in: applicationIds };
    }

    const updated = await prisma.$transaction(async (tx) => {
      const applications = await tx.application.findMany({
        where,
        select: { id: true, status: true },
      });

      const targetStatus = finalList ? "FINAL_LIST" : "ORAL_TEST";
      const eligible = applications.filter((a) =>
        ["APPROVED", "ORAL_TEST", "UNDER_REVIEW", "PENDING"].includes(a.status)
      );

      const result = await tx.application.updateMany({
        where: { id: { in: eligible.map((a) => a.id) } },
        data: {
          status: targetStatus,
          reviewedAt: new Date(),
          reviewedBy: user.id,
        },
      });

      for (const a of eligible) {
        await tx.statusHistory.create({
          data: {
            applicationId: a.id,
            status: targetStatus,
            note: finalList ? "Validation finale par jury/commission" : "Présélection pour oral",
            changedBy: user.id,
          },
        });
      }

      return { count: result.count };
    });

    await prisma.auditLog.create({
      data: {
        adminId: user.id,
        action: "RESULTS_VALIDATED",
        entity: "job",
        entityId: jobId,
        details: { finalList, ...updated, applicationIds },
      },
    });

    return NextResponse.json({
      message: finalList
        ? `${updated.count} candidature(s) validée(s) en liste finale`
        : `${updated.count} candidature(s) marquée(s) pour oral`,
      ...updated,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Failed to validate results:", error);
    return NextResponse.json({ error: "Failed to validate results" }, { status: 500 });
  }
}
