export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { z } from "zod";
import { ROLES, requireRole, isErrorResponse } from "@/lib/roles";

const updatePersonalInfoSchema = z.object({
  fullName: z.string().min(1).optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  dateOfBirth: z.string().optional(),
  birthPlace: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE"]).optional(),
  familyStatus: z.string().optional(),
  numberOfChildren: z.number().optional(),
  nationality: z.string().optional(),
  phone: z.string().optional(),
  governorate: z.string().optional(),
  delegation: z.string().optional(),
  address: z.string().optional(),
  postalCode: z.string().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(ROLES.CANDIDATE);
    if (isErrorResponse(user)) return user;

    const { id } = await params;

    const application = await prisma.application.findUnique({
      where: { id },
      select: { id: true, candidateId: true, personalInfo: true },
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    if (application.candidateId !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const validated = updatePersonalInfoSchema.parse(body);

    const existingPersonalInfo = (application.personalInfo as Record<string, unknown>) || {};
    const mergedPersonalInfo = { ...existingPersonalInfo, ...validated };

    await prisma.application.update({
      where: { id },
      data: { personalInfo: mergedPersonalInfo },
    });

    return NextResponse.json({ message: "Personal info updated" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    console.error("Failed to update personal info:", error);
    return NextResponse.json({ error: "Failed to update personal info" }, { status: 500 });
  }
}
