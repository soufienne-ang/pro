export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { prisma } from "@/server/prisma";
import { z } from "zod";

const GOVERNORATES = [
  "Ariana", "Béja", "Ben Arous", "Bizerte", "Gabès", "Gafsa", "Jendouba", "Kairouan",
  "Kasserine", "Kébili", "Le Kef", "Mahdia", "Manouba", "Medenine", "Monastir", "Nabeul",
  "Sfax", "Sidi Bouzid", "Siliana", "Sousse", "Tataouine", "Tozeur", "Tunis", "Zaghouan",
];

const updateProfileSchema = z.object({
  fullName: z.string().min(3).optional(),
  phone: z.string().regex(/^\d{2}\s\d{3}\s\d{3}$/).optional(),
  governorate: z.string().refine((v) => GOVERNORATES.includes(v)).optional(),
  delegation: z.string().min(1).optional(),
  smsOptIn: z.boolean().optional(),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "CANDIDATE") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const candidate = await prisma.candidate.findUnique({
      where: { id: session.user.id },
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
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "CANDIDATE") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = updateProfileSchema.parse(body);

    const candidate = await prisma.candidate.update({
      where: { id: session.user.id },
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
