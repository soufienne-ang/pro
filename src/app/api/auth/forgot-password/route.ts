export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { forgotPasswordSchema } from "@/lib/schemas/auth";
import { sendPasswordResetEmail } from "@/server/email";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const locale = (request.nextUrl.searchParams.get("locale") as "ar" | "fr") || "ar";
    const { email } = body;

    forgotPasswordSchema.parse({ email });

    const candidate = await prisma.candidate.findUnique({
      where: { email },
    });

    if (!candidate) {
      return NextResponse.json(
        { message: locale === "ar" ? "تم إرسال رابط الاستعادة إلى بريدك الإلكتروني" : "Un lien de récupération a été envoyé à votre email" },
        { status: 200 }
      );
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.candidate.update({
      where: { id: candidate.id },
      data: {
        verificationCode: code,
        verificationExpiry: expiry,
      },
    });

    await sendPasswordResetEmail(email, candidate.fullName, code, locale);

    return NextResponse.json({
      message: locale === "ar" ? "تم إرسال رابط الاستعادة إلى بريدك الإلكتروني" : "Un lien de récupération a été envoyé à votre email",
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}