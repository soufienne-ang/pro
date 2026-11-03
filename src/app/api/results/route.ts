export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { computeDossierScore, combineTotalScore } from "@/server/scoring";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cin = searchParams.get("cin")?.trim();
    const jobId = searchParams.get("jobId")?.trim();

    if (!cin) {
      return NextResponse.json({ error: "CIN is required" }, { status: 400 });
    }

    const candidate = await prisma.candidate.findUnique({
      where: { cin },
      select: {
        id: true,
        fullName: true,
        email: true,
        cin: true,
        phone: true,
        governorate: true,
        applications: {
          where: jobId ? { jobId } : undefined,
          include: {
            job: {
              select: {
                id: true,
                code: true,
                titleAr: true,
                titleFr: true,
                profile: true,
                dossierWeight: true,
                oralWeight: true,
                resultsPublished: true,
                resultsArchived: true,
              },
            },
            scores: { include: { criteria: { select: { name: true, weight: true } } } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!candidate) {
      return NextResponse.json({ error: "Candidat introuvable" }, { status: 404 });
    }

    const visibleApplications = candidate.applications.filter(
      (app) => app.job.resultsPublished
    );

    const results = visibleApplications.map((app) => {
      const oralSum = app.scores.reduce((sum, s) => sum + s.value, 0);
      const dossier = computeDossierScore({
        academicInfo: app.academicInfo,
        profile: app.job.profile,
        eduLevel: app.eduLevel,
      });
      const total = combineTotalScore(dossier, oralSum, app.job);

      const criteriaDetails = app.scores.map((s) => ({
        name: s.criteria.name,
        weight: s.criteria.weight,
        value: s.value,
      }));

      return {
        applicationId: app.id,
        jobId: app.job.id,
        jobCode: app.job.code,
        jobTitleAr: app.job.titleAr,
        jobTitleFr: app.job.titleFr,
        profile: app.job.profile,
        status: app.status,
        archived: app.job.resultsArchived,
        applicationScore: dossier,
        oralTotal: Math.round(oralSum * 100) / 100,
        totalScore: total,
        rank: app.rank,
        criteriaDetails,
      };
    });

    return NextResponse.json({
      candidate: {
        fullName: candidate.fullName,
        email: candidate.email,
        cin: candidate.cin,
        phone: candidate.phone,
        governorate: candidate.governorate,
      },
      results,
    });
  } catch (error) {
    console.error("GET /api/results error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
