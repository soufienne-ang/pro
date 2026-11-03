export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requirePermission, isErrorResponse } from "@/lib/roles";
import { computeDossierScore } from "@/server/scoring";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission("viewCandidates");
    if (isErrorResponse(user)) return user;

    const { id } = await params;

    const candidate = await prisma.candidate.findUnique({
      where: { id },
      select: { id: true, fullName: true },
    });

    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    const applications = await prisma.application.findMany({
      where: { candidateId: id },
      select: {
        id: true,
        status: true,
        academicInfo: true,
        eduLevel: true,
        job: {
          select: {
            id: true,
            code: true,
            titleFr: true,
            titleAr: true,
            profile: true,
            minEduLevel: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const withScores = applications.map((app) => {
      const info = (app.academicInfo as Record<string, unknown>) || {};
      return {
        id: app.id,
        job: app.job,
        status: app.status,
        eduLevel: app.eduLevel,
        academicInfo: {
          moyenneBac: (info.moyenneBac as string) || "",
          moyenne1ere: (info.moyenne1ere as string) || "",
          moyenne2eme: (info.moyenne2eme as string) || "",
          moyenne3eme: (info.moyenne3eme as string) || "",
        },
        applicationScore: computeDossierScore({
          academicInfo: app.academicInfo,
          profile: app.job.profile,
          eduLevel: app.eduLevel,
        }),
      };
    });

    return NextResponse.json({
      candidate: { id: candidate.id, fullName: candidate.fullName },
      applications: withScores,
    });
  } catch (error) {
    console.error("Failed to fetch candidate scores:", error);
    return NextResponse.json({ error: "Failed to fetch scores" }, { status: 500 });
  }
}
