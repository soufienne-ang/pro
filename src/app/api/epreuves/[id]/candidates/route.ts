export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requirePermission, isErrorResponse } from "@/lib/roles";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission("viewExams");
    if (isErrorResponse(user)) return user;

    const { id } = await params;

    const exam = await prisma.exam.findUnique({
      where: { id },
      select: { jobId: true },
    });
    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    const applications = await prisma.application.findMany({
      where: {
        jobId: exam.jobId,
        status: { in: ["APPROVED", "ORAL_TEST"] },
      },
      select: {
        id: true,
        status: true,
        candidate: {
          select: {
            id: true,
            fullName: true,
            email: true,
            cin: true,
            phone: true,
            governorate: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const sessionIds = await prisma.examSession.findMany({
      where: { examId: id },
      select: { id: true },
    });

    const existingResultCandidateIds = new Set<string>();
    if (sessionIds.length > 0) {
      const results = await prisma.examResult.findMany({
        where: { sessionId: { in: sessionIds.map((s) => s.id) } },
        select: { candidateId: true },
      });
      results.forEach((r) => existingResultCandidateIds.add(r.candidateId));
    }

    const candidates = applications.map((app) => ({
      ...app.candidate,
      applicationId: app.id,
      applicationStatus: app.status,
      hasResult: existingResultCandidateIds.has(app.candidate.id),
    }));

    return NextResponse.json(candidates);
  } catch (error) {
    console.error("Failed to fetch exam candidates:", error);
    return NextResponse.json({ error: "Failed to fetch exam candidates" }, { status: 500 });
  }
}
