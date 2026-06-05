export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { z } from "zod";
import { requirePermission, isErrorResponse } from "@/lib/roles";

const createCriteriaSchema = z.object({
  jobId: z.string(),
  name: z.string().min(1),
  weight: z.number().positive(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission("viewRanking");
    if (isErrorResponse(user)) return user;

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");
    if (!jobId) {
      return NextResponse.json({ error: "jobId is required" }, { status: 400 });
    }

    const criteria = await prisma.scoredCriteria.findMany({
      where: { jobId },
      orderBy: { id: "asc" },
    });

    return NextResponse.json(criteria);
  } catch (error) {
    console.error("Failed to fetch criteria:", error);
    return NextResponse.json({ error: "Failed to fetch criteria" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission("manageScoringCriteria");
    if (isErrorResponse(user)) return user;

    const body = await request.json();
    const { jobId, name, weight } = createCriteriaSchema.parse(body);

    const criteria = await prisma.scoredCriteria.create({
      data: { jobId, name, weight },
    });

    await prisma.auditLog.create({
      data: {
        adminId: user.id,
        action: "CRITERIA_CREATED",
        entity: "scored_criteria",
        entityId: criteria.id,
        details: { jobId, name, weight },
      },
    });

    return NextResponse.json(criteria, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Failed to create criteria:", error);
    return NextResponse.json({ error: "Failed to create criteria" }, { status: 500 });
  }
}
