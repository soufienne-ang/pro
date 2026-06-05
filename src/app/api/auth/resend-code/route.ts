export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { sendVerificationEmail } from "@/server/email";

const RESEND_COOLDOWN_MS = 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const locale = (request.nextUrl.searchParams.get("locale") as "ar" | "fr") || "ar";
    const { candidateId } = body as { candidateId?: string };

    if (!candidateId) {
      return NextResponse.json(
        { error: locale === "ar" ? "بيانات غير صحيحة" : "Données invalides" },
        { status: 400 }
      );
    }

    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      select: {
        id: true,
        email: true,
        fullName: true,
        isEmailVerified: true,
        verificationExpiry: true,
        updatedAt: true,
      },
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

    if (
      candidate.verificationExpiry &&
      Date.now() - new Date(candidate.verificationExpiry).getTime() < -14 * 60 * 1000 &&
      Date.now() - candidate.updatedAt.getTime() < RESEND_COOLDOWN_MS
    ) {
      return NextResponse.json(
        {
          error: locale === "ar"
            ? "يرجى الانتظار 60 ثانية قبل إعادة الإرسال"
            : "Veuillez patienter 60 secondes avant de renvoyer",
        },
        { status: 429 }
      );
    }

    const { code, expiry } = await sendVerificationEmail(
      candidate.email,
      candidate.fullName,
      locale
    );

    await prisma.candidate.update({
      where: { id: candidateId },
      data: {
        verificationCode: code,
        verificationExpiry: expiry,
      },
    });

    return NextResponse.json({
      message: locale === "ar"
        ? "تم إعادة إرسال رمز التحقق"
        : "Code de vérification renvoyé",
    });
  } catch (error: unknown) {
    console.error("Resend code error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
