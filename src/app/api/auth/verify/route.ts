export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { verifyEmailSchema } from "@/lib/schemas/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const locale = (request.nextUrl.searchParams.get("locale") as "ar" | "fr") || "ar";
    const { candidateId, code } = body;

    verifyEmailSchema.parse({ code });

    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
    });

    if (!candidate) {
      return NextResponse.json(
        { error: locale === "ar" ? "الحساب غير موجود" : "Compte introuvable" },
        { status: 404 }
      );
    }

    if (candidate.isEmailVerified) {
      return NextResponse.json(
        { error: locale === "ar" ? "تم التحقق من البريد الإلكتروني مسبقاً" : "Email déjà vérifié" },
        { status: 400 }
      );
    }

    if (candidate.verificationCode !== code) {
      return NextResponse.json(
        { error: locale === "ar" ? "رمز التحقق غير صحيح" : "Code de vérification incorrect" },
        { status: 400 }
      );
    }

    if (candidate.verificationExpiry && new Date() > candidate.verificationExpiry) {
      return NextResponse.json(
        { error: locale === "ar" ? "انتهت صلاحية رمز التحقق" : "Code expiré" },
        { status: 400 }
      );
    }

    await prisma.candidate.update({
      where: { id: candidateId },
      data: {
        isEmailVerified: true,
        verificationCode: null,
        verificationExpiry: null,
      },
    });

    await prisma.auditLog.create({
      data: {
        candidateId,
        action: "EMAIL_VERIFIED",
        entity: "candidate",
        entityId: candidateId,
      },
    });

    return NextResponse.json({
      message: locale === "ar" ? "تم التحقق من البريد الإلكتروني بنجاح" : "Email vérifié avec succès",
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }
    console.error("Verification error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}