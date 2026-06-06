export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requirePermission, isErrorResponse } from "@/lib/roles";
import PDFDocument from "pdfkit";
import path from "path";
import reshaper from "arabic-reshaper";

function rs(text: string): string {
  return reshaper.convertArabic(text);
}

const FONT_REGULAR = path.join(process.cwd(), "public", "fonts", "NotoSansArabic-Regular.ttf");
const FONT_BOLD = path.join(process.cwd(), "public", "fonts", "NotoSansArabic-Bold.ttf");

function formatDateAr(date: Date): string {
  const d = date.getDate().toString().padStart(2, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

function genderLabel(gender: string | null | undefined): string {
  return gender === "FEMALE" ? "المدعوة" : "المدعو";
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission("generateConvocation");
    if (isErrorResponse(user)) return user;

    const { id } = await params;

    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        candidate: true,
        job: true,
        documents: true,
      },
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const doc = new PDFDocument({ size: "A4", margin: 60 });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));

    doc.registerFont("Arabic", FONT_REGULAR);
    doc.registerFont("Arabic-Bold", FONT_BOLD);

    const candidate = application.candidate;
    const job = application.job;
    const personalInfo = application.personalInfo as Record<string, unknown> | null;
    const academicInfo = application.academicInfo as Record<string, unknown> | null;

    const pageWidth = doc.page.width - 120;

    doc.fontSize(16).font("Arabic-Bold").fillColor("#1a1a1a")
      .text(rs("الجمهورية التونسية"), { align: "center" });
    doc.fontSize(12).font("Arabic").fillColor("#333")
      .text(rs("وزارة الشباب والرياضة"), { align: "center" });
    doc.moveDown(0.3);
    doc.fontSize(20).font("Arabic-Bold").fillColor("#991b1b")
      .text("PROMOSPORT", { align: "center" });
    doc.moveDown(1.5);

    doc.fontSize(16).font("Arabic-Bold").fillColor("#1a1a1a")
      .text(rs("استدعاء"), { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(12).font("Arabic-Bold").fillColor("#333")
      .text(job.titleAr || job.titleFr, { align: "center" });
    doc.fontSize(10).font("Arabic").fillColor("#666")
      .text(rs("الرمز") + " : " + job.code, { align: "center" });
    doc.moveDown(1.5);

    doc.moveTo(60, doc.y).lineTo(60 + pageWidth, doc.y).strokeColor("#ccc").stroke();
    doc.moveDown(1);

    const candidateLabel = rs(genderLabel(personalInfo?.gender as string | null));
    doc.fontSize(12).font("Arabic-Bold").fillColor("#1a1a1a")
      .text(candidateLabel + " : " + candidate.fullName, { align: "right" });
    doc.fontSize(9).font("Arabic").fillColor("#666")
      .text(rs("المرجع") + " : " + application.id, { align: "right" });
    doc.moveDown(1.5);

    doc.fontSize(12).font("Arabic-Bold").fillColor("#000")
      .text(rs("المعطيات الشخصية"), { align: "right" });
    doc.moveDown(0.3);
    doc.fontSize(10).font("Arabic").fillColor("#333");

    const rightTexts = [
      rs("الاسم واللقب") + " : " + candidate.fullName,
      rs("رقم بطاقة التعريف") + " : " + candidate.cin,
      rs("البريد الإلكتروني") + " : " + candidate.email,
      rs("الهاتف") + " : " + candidate.phone,
      rs("العنوان") + " : " + candidate.governorate + (candidate.delegation ? "، " + candidate.delegation : ""),
    ];

    for (const t of rightTexts) {
      doc.text(t, { align: "right" });
    }

    const diplomas = (academicInfo?.diplomas as Array<Record<string, unknown>> | undefined)?.filter(Boolean) || [];
    if (diplomas.length > 0) {
      const top = diplomas.sort((a, b) => (b.graduationYear as number) - (a.graduationYear as number))[0];
      if (top?.diploma) doc.text(rs("الشهادة") + " : " + (top.diploma as string), { align: "right" });
      if (top?.institution) doc.text(rs("المؤسسة") + " : " + (top.institution as string), { align: "right" });
    }

    doc.moveDown(1.5);

    if (job.requiredDocs) {
      doc.fontSize(12).font("Arabic-Bold").fillColor("#000")
        .text(rs("الوثائق المطلوب تقديمها"), { align: "right" });
      doc.moveDown(0.3);
      doc.fontSize(9).font("Arabic").fillColor("#555");
      for (const d of job.requiredDocs.split("\n").filter(Boolean)) {
        doc.text("  - " + d.trim(), { align: "right" });
      }
      doc.moveDown(1.5);
    }

    if (application.documents.length > 0) {
      doc.fontSize(12).font("Arabic-Bold").fillColor("#000")
        .text(rs("الوثائق المرفوعة"), { align: "right" });
      doc.moveDown(0.3);
      doc.fontSize(9).font("Arabic").fillColor("#555");
      for (const f of application.documents) {
        doc.text("  - " + f.fileName, { align: "right" });
      }
      doc.moveDown(1.5);
    }

    doc.moveTo(60, doc.y).lineTo(60 + pageWidth, doc.y).strokeColor("#ccc").stroke();
    doc.moveDown(1);
    doc.fontSize(9).font("Arabic").fillColor("#666")
      .text(rs("تحرير بتونس في") + " : " + formatDateAr(new Date()), { align: "right" });
    doc.moveDown(0.5);
    doc.text(rs("توقيع المترشح") + " : _________________________", { align: "right" });

    doc.end();

    return new Promise<NextResponse>((resolve) => {
      doc.on("end", () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve(new NextResponse(pdfBuffer, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": "attachment; filename=\"convocation-" + application.id + ".pdf\"",
            "Content-Length": pdfBuffer.length.toString(),
          },
        }));
      });
      doc.on("error", (err: Error) => {
        console.error("PDF stream error:", err);
        resolve(NextResponse.json({ error: "PDF generation failed: " + err.message }, { status: 500 }));
      });
    });
  } catch (error) {
    console.error("Convocation error:", error);
    return NextResponse.json({
      error: "Failed to generate convocation: " + (error instanceof Error ? error.message : "Unknown")
    }, { status: 500 });
  }
}
