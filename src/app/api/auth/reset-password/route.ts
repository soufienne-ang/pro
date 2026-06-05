export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/server/prisma";
import { resetPasswordSchema } from "@/lib/schemas/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const locale = (request.nextUrl.searchParams.get("locale") as "ar" | "fr") || "ar";
    const { email, code, password } = body;

    resetPasswordSchema.parse({ password, confirmPassword: password, code });

    const candidate = await prisma.candidate.findUnique({
      where: { email },
    });

    if (!candidate) {
      return NextResponse.json(
        { error: locale === "ar" ? "الحساب غير موجود" : "Compte introuvable" },
        { status: 404 }
      );
    }

    if (candidate.verificationCode !== code) {
      return NextResponse.json(
        { error: locale === "ar" ? "رمز التحقق غير صحيح" : "Code incorrect" },
        { status: 400 }
      );
    }

    if (candidate.verificationExpiry && new Date() > candidate.verificationExpiry) {
      return NextResponse.json(
        { error: locale === "ar" ? "انتهت صلاحية الرمز" : "Code expiré" },
        { status: 400 }
      );
    }

    const hashedPassword = await hash(password, 12);

    await prisma.candidate.update({
      where: { id: candidate.id },
      data: {
        password: hashedPassword,
        verificationCode: null,
        verificationExpiry: null,
      },
    });

    await prisma.auditLog.create({
      data: {
        candidateId: candidate.id,
        action: "PASSWORD_RESET",
        entity: "candidate",
        entityId: candidate.id,
      },
    });

    return NextResponse.json({
      message: locale === "ar" ? "تم تغيير كلمة المرور بنجاح" : "Mot de passe changé avec succès",
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }
    console.error("Password reset error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}