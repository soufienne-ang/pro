export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requirePermission, isErrorResponse } from "@/lib/roles";
import { z } from "zod";

const createExamSchema = z.object({
  titleAr: z.string().min(1),
  titleFr: z.string().min(1),
  jobId: z.string().min(1),
  type: z.enum(["WRITTEN", "ORAL", "PRACTICAL", "SPORTS"]),
  coefficient: z.number().positive().default(1),
  duration: z.number().int().positive().optional(),
  description: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission("viewExams");
    if (isErrorResponse(user)) return user;

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    const exams = await prisma.exam.findMany({
      where: jobId ? { jobId } : {},
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
          select: { id: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(exams);
  } catch (error) {
    console.error("Failed to fetch exams:", error);
    return NextResponse.json({ error: "Failed to fetch exams" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission("manageExams");
    if (isErrorResponse(user)) return user;

    const body = await request.json();
    const validated = createExamSchema.parse(body);

    const exam = await prisma.exam.create({
      data: validated,
    });

    await prisma.auditLog.create({
      data: {
        adminId: user.id,
        action: "EXAM_CREATED",
        entity: "Exam",
        entityId: exam.id,
        details: validated,
      },
    });

    return NextResponse.json(exam, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map((err) => `${err.path.join(".")}: ${err.message}`).join(", ");
      return NextResponse.json({ error: messages }, { status: 400 });
    }
    console.error("Failed to create exam:", error);
    return NextResponse.json({ error: "Failed to create exam" }, { status: 500 });
  }
}
