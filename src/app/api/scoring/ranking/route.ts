export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { prisma } from "@/server/prisma";

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

    const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);

    const ranked = applications.map((app) => {
      const scoreMap = new Map(app.scores.map((s) => [s.criteriaId, s.value]));
      const weightedScore = criteria.reduce((sum, c) => {
        const val = scoreMap.get(c.id) || 0;
        return sum + val * (c.weight / totalWeight);
      }, 0);

      return {
        applicationId: app.id,
        candidate: app.candidate,
        status: app.status,
        scores: criteria.map((c) => ({
          criteriaId: c.id,
          criteriaName: c.name,
          weight: c.weight,
          value: scoreMap.get(c.id) || 0,
        })),
        weightedScore: Math.round(weightedScore * 100) / 100,
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
