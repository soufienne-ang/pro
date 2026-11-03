export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requirePermission, isErrorResponse } from "@/lib/roles";
import { z } from "zod";

const updateExamSchema = z.object({
  titleAr: z.string().min(1).optional(),
  titleFr: z.string().min(1).optional(),
  jobId: z.string().min(1).optional(),
  type: z.enum(["WRITTEN", "ORAL", "PRACTICAL", "SPORTS"]).optional(),
  coefficient: z.number().positive().optional(),
  duration: z.number().int().positive().optional(),
  description: z.string().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const exam = await prisma.exam.findUnique({
      where: { id },
      include: {
        job: {
          select: {
            id: true,
            code: true,
            titleFr: true,
            titleAr: true,
          },
        },
        sessions: {
          include: {
            room: true,
            _count: {
              select: { results: true },
            },
          },
          orderBy: { date: "asc" },
        },
        _count: {
          select: { sessions: true },
        },
      },
    });

    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    return NextResponse.json(exam);
  } catch (error) {
    console.error("Failed to fetch exam:", error);
    return NextResponse.json({ error: "Failed to fetch exam" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission("manageExams");
    if (isErrorResponse(user)) return user;

    const { id } = await params;
    const body = await request.json();
    const validated = updateExamSchema.parse(body);

    const exam = await prisma.exam.update({
      where: { id },
      data: validated,
    });

    await prisma.auditLog.create({
      data: {
        adminId: user.id,
        action: "EXAM_UPDATED",
        entity: "Exam",
        entityId: id,
        details: validated,
      },
    });

    return NextResponse.json(exam);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map((err) => `${err.path.join(".")}: ${err.message}`).join(", ");
      return NextResponse.json({ error: messages }, { status: 400 });
    }
    console.error("Failed to update exam:", error);
    return NextResponse.json({ error: "Failed to update exam" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission("manageExams");
    if (isErrorResponse(user)) return user;

    const { id } = await params;

    await prisma.exam.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        adminId: user.id,
        action: "EXAM_DELETED",
        entity: "Exam",
        entityId: id,
      },
    });

    return NextResponse.json({ message: "Exam deleted" });
  } catch (error) {
    console.error("Failed to delete exam:", error);
    return NextResponse.json({ error: "Failed to delete exam" }, { status: 500 });
  }
}
