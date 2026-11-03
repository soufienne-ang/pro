export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requirePermission, isErrorResponse } from "@/lib/roles";
import { z } from "zod";

const submitResultSchema = z.object({
  sessionId: z.string().min(1),
  scores: z.array(z.object({
    candidateId: z.string().min(1),
    score: z.number().min(0).optional().nullable(),
    present: z.boolean().default(true),
  })),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission("viewExams");
    if (isErrorResponse(user)) return user;

    const { id } = await params;

    const exam = await prisma.exam.findUnique({ where: { id } });
    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    const sessionIds = await prisma.examSession.findMany({
      where: { examId: id },
      select: { id: true },
    });

    if (sessionIds.length === 0) {
      return NextResponse.json([]);
    }

    const results = await prisma.examResult.findMany({
      where: { sessionId: { in: sessionIds.map((s) => s.id) } },
      include: {
        session: {
          select: {
            id: true,
            date: true,
            startTime: true,
            endTime: true,
            type: true,
          },
        },
        candidate: {
          select: {
            id: true,
            fullName: true,
            email: true,
            cin: true,
            phone: true,
          },
        },
      },
      orderBy: { gradedAt: "desc" },
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error("Failed to fetch results:", error);
    return NextResponse.json({ error: "Failed to fetch results" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission("gradeExams");
    if (isErrorResponse(user)) return user;

    const { id } = await params;

    const exam = await prisma.exam.findUnique({ where: { id } });
    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    const body = await request.json();
    const validated = submitResultSchema.parse(body);

    const session = await prisma.examSession.findFirst({
      where: { id: validated.sessionId, examId: id },
    });
    if (!session) {
      return NextResponse.json({ error: "Session not found for this exam" }, { status: 404 });
    }

    const results = [];
    for (const s of validated.scores) {
      const result = await prisma.examResult.upsert({
        where: {
          sessionId_candidateId: {
            sessionId: validated.sessionId,
            candidateId: s.candidateId,
          },
        },
        update: {
          score: s.score ?? null,
          present: s.present,
          gradedBy: user.id,
          gradedAt: new Date(),
        },
        create: {
          sessionId: validated.sessionId,
          candidateId: s.candidateId,
          score: s.score ?? null,
          present: s.present,
          gradedBy: user.id,
          gradedAt: new Date(),
        },
      });
      results.push(result);
    }

    await prisma.auditLog.create({
      data: {
        adminId: user.id,
        action: "RESULT_SUBMITTED",
        entity: "ExamResult",
        entityId: id,
        details: { sessionId: validated.sessionId, count: results.length },
      },
    });

    return NextResponse.json(results, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map((err) => `${err.path.join(".")}: ${err.message}`).join(", ");
      return NextResponse.json({ error: messages }, { status: 400 });
    }
    console.error("Failed to submit result:", error);
    return NextResponse.json({ error: "Failed to submit result" }, { status: 500 });
  }
}
