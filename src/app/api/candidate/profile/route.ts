export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { z } from "zod";
import { ROLES, requireRole, isErrorResponse } from "@/lib/roles";

const GOVERNORATES = [
  "Ariana", "Béja", "Ben Arous", "Bizerte", "Gabès", "Gafsa", "Jendouba", "Kairouan",
  "Kasserine", "Kébili", "Le Kef", "Mahdia", "Manouba", "Medenine", "Monastir", "Nabeul",
  "Sfax", "Sidi Bouzid", "Siliana", "Sousse", "Tataouine", "Tozeur", "Tunis", "Zaghouan",
];

const updateProfileSchema = z.object({
  fullName: z.string().min(3).optional(),
  phone: z.string().regex(/^\d{8}$/).optional(),
  governorate: z.string().refine((v) => GOVERNORATES.includes(v)).optional(),
  delegation: z.string().min(1).optional(),
  smsOptIn: z.boolean().optional(),
});

export async function GET() {
  try {
    const user = await requireRole(ROLES.CANDIDATE);
    if (isErrorResponse(user)) return user;

    const candidate = await prisma.candidate.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        cin: true,
        dateOfBirth: true,
        gender: true,
        phone: true,
        governorate: true,
        delegation: true,
        smsOptIn: true,
        hasExperience: true,
        isEmailVerified: true,
        createdAt: true,
        documents: {
          select: {
            id: true,
            type: true,
            fileName: true,
            fileUrl: true,
            fileSize: true,
            mimeType: true,
            uploadedAt: true,
          },
          orderBy: { uploadedAt: "desc" },
        },
      },
    });

    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    return NextResponse.json({ candidate });
  } catch (error) {
    console.error("Failed to fetch profile:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireRole(ROLES.CANDIDATE);
    if (isErrorResponse(user)) return user;

    const body = await request.json();
    const validated = updateProfileSchema.parse(body);

    const candidate = await prisma.candidate.update({
      where: { id: user.id },
      data: validated,
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        governorate: true,
        delegation: true,
        smsOptIn: true,
      },
    });

    return NextResponse.json({ message: "Profile updated", candidate });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    console.error("Failed to update profile:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
