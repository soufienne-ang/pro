export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireRole, isErrorResponse } from "@/lib/roles";
import { computeDossierScore } from "@/server/scoring";

export async function GET() {
  try {
    const user = await requireRole("SUPER_ADMIN");
    if (isErrorResponse(user)) return user;

    const applications = await prisma.application.findMany({
      where: {},
      select: {
        id: true,
        status: true,
        academicInfo: true,
        eduLevel: true,
        candidate: {
          select: {
            id: true,
            fullName: true,
            email: true,
            cin: true,
            governorate: true,
          },
        },
        job: {
          select: {
            id: true,
            code: true,
            titleFr: true,
            titleAr: true,
            profile: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const withScores = applications.map((app) => ({
      id: app.id,
      candidate: app.candidate,
      job: app.job,
      status: app.status,
      applicationScore: computeDossierScore({
        academicInfo: app.academicInfo,
        profile: app.job.profile,
        eduLevel: app.eduLevel,
      }),
    }));

    withScores.sort((a, b) => b.applicationScore - a.applicationScore);

    return NextResponse.json(withScores);
  } catch (error) {
    console.error("Failed to fetch dashboard scores:", error);
    return NextResponse.json({ error: "Failed to fetch scores" }, { status: 500 });
  }
}
