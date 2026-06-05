export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { hash, compare } from "bcryptjs";
import { z } from "zod";
import { ROLES, requireRole, isErrorResponse } from "@/lib/roles";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/),
});

export async function PUT(request: NextRequest) {
  try {
    const user = await requireRole(ROLES.CANDIDATE);
    if (isErrorResponse(user)) return user;

    const body = await request.json();
    const validated = changePasswordSchema.parse(body);

    const candidate = await prisma.candidate.findUnique({
      where: { id: user.id },
      select: { password: true },
    });

    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    const isValid = await compare(validated.currentPassword, candidate.password);
    if (!isValid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }

    const hashedPassword = await hash(validated.newPassword, 12);

    await prisma.candidate.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    await prisma.auditLog.create({
      data: {
        candidateId: user.id,
        action: "PASSWORD_CHANGED",
        entity: "candidate",
        entityId: user.id,
      },
    });

    return NextResponse.json({ message: "Password updated successfully" });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    console.error("Failed to change password:", error);
    return NextResponse.json({ error: "Failed to change password" }, { status: 500 });
  }
}
