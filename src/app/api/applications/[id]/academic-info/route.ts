export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";

const diplomaSchema = z.object({
  studyLevel: z.string().optional().default(""),
  diploma: z.string().optional().default(""),
  institution: z.string().optional().default(""),
  grade: z.string().optional().default(""),
  noteGenerale: z.string().optional().default(""),
  graduationYear: z.number().optional(),
});

const updateAcademicInfoSchema = z.object({
  diplomas: z.array(diplomaSchema).optional(),
  moyenneBac: z.string().optional(),
  moyenne1ere: z.string().optional(),
  moyenne2eme: z.string().optional(),
  moyenne3eme: z.string().optional(),
});

const STAFF_ROLES = ["SUPER_ADMIN", "HR_AGENT", "JURY_MEMBER", "REVIEWER", "COMMISSION"];

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = session.user.id;
    const userRole = session.user.role;

    const application = await prisma.application.findUnique({
      where: { id },
      select: { id: true, candidateId: true, academicInfo: true },
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const isStaff = STAFF_ROLES.includes(userRole);
    if (!isStaff && application.candidateId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const validated = updateAcademicInfoSchema.parse(body);

    const currentAcademicInfo = (application.academicInfo as Record<string, unknown>) || {};
    const merged = { ...currentAcademicInfo, ...validated };

    await prisma.application.update({
      where: { id },
      data: { academicInfo: merged as object },
    });

    return NextResponse.json({ message: "Academic info updated", academicInfo: merged });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    console.error("Failed to update academic info:", error);
    return NextResponse.json({ error: "Failed to update academic info" }, { status: 500 });
  }
}
