export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requirePermission, isErrorResponse } from "@/lib/roles";
import { z } from "zod";

const createSessionSchema = z.object({
  examId: z.string().min(1),
  roomId: z.string().min(1).optional().nullable(),
  name: z.string().optional(),
  date: z.string().refine((v) => !isNaN(new Date(v).getTime()), "Invalid date"),
  endDate: z.string().refine((v) => !isNaN(new Date(v).getTime()), "Invalid date").optional(),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  type: z.enum(["MAIN", "RESIT"]).default("MAIN"),
  maxCandidates: z.number().int().positive().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const exam = await prisma.exam.findUnique({ where: { id } });
    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    const sessions = await prisma.examSession.findMany({
      where: { examId: id },
      include: {
        room: true,
      },
      orderBy: { date: "asc" },
    });

    return NextResponse.json(sessions);
  } catch (error) {
    console.error("Failed to fetch sessions:", error);
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission("scheduleExams");
    if (isErrorResponse(user)) return user;

    const { id } = await params;

    const exam = await prisma.exam.findUnique({ where: { id } });
    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    const body = await request.json();
    const validated = createSessionSchema.parse({ ...body, examId: id });

    const session = await prisma.examSession.create({
      data: {
        examId: validated.examId,
        roomId: validated.roomId ?? null,
        name: validated.name ?? null,
        date: new Date(validated.date),
        endDate: validated.endDate ? new Date(validated.endDate) : null,
        startTime: validated.startTime,
        endTime: validated.endTime,
        type: validated.type,
        maxCandidates: validated.maxCandidates,
      },
      include: {
        room: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        adminId: user.id,
        action: "SESSION_CREATED",
        entity: "ExamSession",
        entityId: session.id,
        details: validated,
      },
    });

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map((err) => `${err.path.join(".")}: ${err.message}`).join(", ");
      return NextResponse.json({ error: messages }, { status: 400 });
    }
    console.error("Failed to create session:", error);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
