export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { z } from "zod";
import { requirePermission, isErrorResponse } from "@/lib/roles";

const scoreEntrySchema = z.object({
  criteriaId: z.string(),
  value: z.number().min(0),
});

const updateScoresSchema = z.object({
  applicationId: z.string(),
  scores: z.array(scoreEntrySchema),
});

export async function PUT(request: NextRequest) {
  try {
    const user = await requirePermission("submitScores");
    if (isErrorResponse(user)) return user;

    const body = await request.json();
    const { applicationId, scores } = updateScoresSchema.parse(body);

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { scores: true },
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    for (const entry of scores) {
      await prisma.score.upsert({
        where: {
          applicationId_criteriaId: {
            applicationId,
            criteriaId: entry.criteriaId,
          },
        },
        create: {
          applicationId,
          criteriaId: entry.criteriaId,
          value: entry.value,
        },
        update: {
          value: entry.value,
        },
      });
    }

    await prisma.application.update({
      where: { id: applicationId },
      data: { status: "UNDER_REVIEW" },
    });

    await prisma.auditLog.create({
      data: {
        adminId: user.id,
        action: "SCORES_UPDATED",
        entity: "application",
        entityId: applicationId,
        details: { scores },
      },
    });

    return NextResponse.json({ message: "Scores updated" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Failed to update scores:", error);
    return NextResponse.json({ error: "Failed to update scores" }, { status: 500 });
  }
}
