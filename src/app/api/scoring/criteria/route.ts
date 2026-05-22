export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { prisma } from "@/server/prisma";
import { z } from "zod";

const createCriteriaSchema = z.object({
  jobId: z.string(),
  name: z.string().min(1),
  weight: z.number().positive(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "REVIEWER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "REVIEWER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { jobId, name, weight } = createCriteriaSchema.parse(body);

    const criteria = await prisma.scoredCriteria.create({
      data: { jobId, name, weight },
    });

    await prisma.auditLog.create({
      data: {
        adminId: session.user.id,
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
