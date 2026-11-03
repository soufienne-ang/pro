export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireUser, isErrorResponse, hasPermission } from "@/lib/roles";
import { generateConvocationPdf } from "@/server/generate-convocation-pdf";
import { sendConvocationEmail } from "@/server/email";
import path from "path";
import fs from "fs";
import os from "os";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    if (isErrorResponse(user)) return user;

    if (!hasPermission(user.role, "generateConvocation")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const { templateId } = await request.json().catch(() => ({}));

    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        candidate: true,
        job: true,
      },
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const pdfBuffer = await generateConvocationPdf(id, templateId || null);

    const fileName = `invitation-${id}.pdf`;
    // Vercel's filesystem is read-only at runtime; only /tmp is writable.
    // The stored path is used as a "sent" marker; downloads are regenerated
    // on demand via the /api/applications/[id]/convocation route.
    const filePath = path.join(os.tmpdir(), "convocations", fileName);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, pdfBuffer);

    const convocationUrl = `/uploads/convocations/${fileName}`;

    await prisma.application.update({
      where: { id },
      data: {
        convocationPath: convocationUrl,
        convocationSentAt: new Date(),
      },
    });

    await sendConvocationEmail(
      application.candidate.email,
      application.candidate.fullName,
      "ar",
      pdfBuffer,
      application.job.titleAr || application.job.titleFr
    ).catch((err) => {
      console.error("[send-convocation] Email failed:", err);
    });

    await prisma.notification.create({
      data: {
        candidateId: application.candidateId,
        type: "CONVOCATION",
        channel: "EMAIL",
        subject: "استدعاء اختبار شفوي",
        body: "تم إرسال استدعاء الاختبار الشفوي إلى بريدك الإلكتروني. يمكنك تحميله من لوحة التحكم.",
        status: "SENT",
      },
    });

    return NextResponse.json({ success: true, convocationUrl });
  } catch (error) {
    console.error("Send convocation error:", error);
    return NextResponse.json({
      error: "Failed to send convocation: " + (error instanceof Error ? error.message : "Unknown")
    }, { status: 500 });
  }
}
