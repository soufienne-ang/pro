export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  code: z.string().length(6).regex(/^\d+$/),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const locale = (request.nextUrl.searchParams.get("locale") as "ar" | "fr") || "ar";

    const { email, code } = schema.parse(body);

    const candidate = await prisma.candidate.findUnique({
      where: { email },
      select: {
        id: true,
        verificationCode: true,
        verificationExpiry: true,
      },
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

    return NextResponse.json({ valid: true });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Verify password code error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
