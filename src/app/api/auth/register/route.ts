export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/server/prisma";
import { ZodError } from "zod";
import { candidateRegistrationSchema } from "@/lib/schemas/auth";
import { sendVerificationEmail } from "@/server/email";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const locale = (request.nextUrl.searchParams.get("locale") as "ar" | "fr") || "ar";

    const validated = candidateRegistrationSchema.parse(body);

    const existingEmail = await prisma.candidate.findUnique({
      where: { email: validated.email },
    });

    if (existingEmail) {
      return NextResponse.json(
        { error: locale === "ar" ? "البريد الإلكتروني مسجل مسبقاً" : "Cet email est déjà enregistré" },
        { status: 400 }
      );
    }

    const existingCIN = await prisma.candidate.findUnique({
      where: { cin: validated.cin },
    });

    if (existingCIN) {
      return NextResponse.json(
        { error: locale === "ar" ? "رقم بطاقة التعريف الوطنية مسجل مسبقاً" : "Ce numéro CIN est déjà enregistré" },
        { status: 400 }
      );
    }

    const hashedPassword = await hash(validated.password, 12);

    const { code, expiry } = await sendVerificationEmail(validated.email, validated.fullName, locale);

    const candidate = await prisma.candidate.create({
      data: {
        email: validated.email,
        password: hashedPassword,
        fullName: validated.fullName,
        cin: validated.cin,
        dateOfBirth: new Date(validated.dateOfBirth),
        gender: validated.gender,
        phone: validated.phone,
        governorate: validated.governorate,
        delegation: validated.delegation,
        smsOptIn: validated.smsOptIn ?? true,
        verificationCode: code,
        verificationExpiry: expiry,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        candidateId: candidate.id,
        action: "REGISTER",
        entity: "candidate",
        entityId: candidate.id,
      },
    });

    return NextResponse.json({
      message: locale === "ar" ? "تم إنشاء الحساب بنجاح" : "Compte créé avec succès",
      candidateId: candidate.id,
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      const messages = error.errors.map((err) => `${err.path.join(".")}: ${err.message}`).join(", ");
      return NextResponse.json({ error: messages }, { status: 400 });
    }
    console.error("Registration error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}