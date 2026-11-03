export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { ensureScoringCriteria } from "@/server/scoring";
import { requirePermission, isErrorResponse } from "@/lib/roles";

export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission("viewRanking");
    if (isErrorResponse(user)) return user;

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");
    if (!jobId) {
      return NextResponse.json({ error: "jobId is required" }, { status: 400 });
    }

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { profile: true },
    });
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    await ensureScoringCriteria(jobId, job.profile);

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
