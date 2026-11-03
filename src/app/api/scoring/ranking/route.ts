export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { ensureScoringCriteria, computeDossierScore, combineTotalScore } from "@/server/scoring";
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
      select: { profile: true, dossierWeight: true, oralWeight: true },
    });
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    await ensureScoringCriteria(jobId, job.profile);

    const [criteria, applications] = await Promise.all([
      prisma.scoredCriteria.findMany({
        where: { jobId },
        orderBy: { id: "asc" },
      }),
      prisma.application.findMany({
        where: { jobId },
        include: {
          candidate: {
            select: {
              id: true,
              fullName: true,
              email: true,
              cin: true,
              governorate: true,
              phone: true,
            },
          },
          scores: {
            include: { criteria: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const ranked = applications.map((app) => {
      const scoreMap = new Map(app.scores.map((s) => [s.criteriaId, s.value]));
      const scoresWithMeta = criteria.map((c) => ({
        criteriaId: c.id,
        criteriaName: c.name,
        weight: c.weight,
        value: scoreMap.get(c.id) || 0,
      }));

      const oralSum = scoresWithMeta.reduce((sum, s) => sum + s.value, 0);
      const dossier = computeDossierScore({
        academicInfo: app.academicInfo,
        profile: job.profile,
        eduLevel: app.eduLevel,
      });
      const total = combineTotalScore(dossier, oralSum, job);

      return {
        applicationId: app.id,
        candidate: app.candidate,
        status: app.status,
        eduLevel: app.eduLevel,
        scores: scoresWithMeta,
        oralTotal: Math.round(oralSum * 100) / 100,
        applicationScore: dossier,
        weightedScore: total,
      };
    });

    ranked.sort((a, b) => b.weightedScore - a.weightedScore);

    const rankedWithPosition = ranked.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));

    return NextResponse.json({
      criteria,
      rankedCandidates: rankedWithPosition,
    });
  } catch (error) {
    console.error("Failed to fetch ranking:", error);
    return NextResponse.json({ error: "Failed to fetch ranking" }, { status: 500 });
  }
}
