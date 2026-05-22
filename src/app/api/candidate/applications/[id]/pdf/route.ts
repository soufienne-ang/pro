export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { prisma } from "@/server/prisma";
import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";

const ARABIC_FONT_PATH = path.join(process.cwd(), "src", "app", "fonts", "NotoSansArabic-Regular.ttf");

function registerArabicFont(doc: PDFKit.PDFDocument): void {
  if (fs.existsSync(ARABIC_FONT_PATH)) {
    doc.registerFont("NotoSansArabic", ARABIC_FONT_PATH);
  }
}

function detectArabic(text: string): boolean {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
}

function safeText(doc: PDFKit.PDFDocument, text: string, options?: Parameters<typeof doc.text>[1]): PDFKit.PDFDocument {
  const hasArabic = detectArabic(text);
  const fontName = hasArabic ? "NotoSansArabic" : "Helvetica";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentFont = (doc as any)._font?.name || "Helvetica";
  
  if (currentFont !== fontName) {
    doc.font(fontName);
  }
  
  return doc.text(text, options);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let doc!: PDFKit.PDFDocument;
  
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "CANDIDATE") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const candidateId = session.user.id;

    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        candidate: true,
        job: true,
        documents: true,
        scores: {
          include: { criteria: true },
        },
      },
    });

    if (!application || application.candidateId !== candidateId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    doc = new PDFDocument({ size: "A4", margin: 50 });
    registerArabicFont(doc);
    
    const chunks: Buffer[] = [];
    let errorOccurred = false;

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("error", (err) => {
      errorOccurred = true;
      console.error("PDFDocument error:", err);
    });

    const candidate = application.candidate;
    const job = application.job;
    const personalInfo = application.personalInfo as Record<string, unknown> | null;
    const academicInfo = application.academicInfo as Record<string, unknown> | null;
    const experienceInfo = application.experienceInfo as Record<string, unknown> | null;

    doc.fontSize(20).font("Helvetica-Bold").text("PROMOSPORT", { align: "center" });
    doc.fontSize(14).text("Application Summary", { align: "center" });
    doc.moveDown();

    doc.fontSize(10).font("Helvetica").fillColor("#666").text(`Submitted: ${application.submittedAt?.toLocaleDateString() || "N/A"}`, { align: "center" });
    safeText(doc, `Status: ${application.status}`, { align: "center" });
    doc.moveDown(2);

    doc.fontSize(14).font("Helvetica-Bold").fillColor("#000").text("Position");
    doc.moveDown(0.5);
    doc.fontSize(10).font("Helvetica").fillColor("#333")
      .text(`Code: ${job.code}`);
    safeText(doc, `Title (FR): ${job.titleFr}`);
    safeText(doc, `Title (AR): ${job.titleAr}`);
    safeText(doc, `Location: ${job.location}`);
    safeText(doc, `Type: ${job.jobType}`);
    doc.moveDown();

    doc.fontSize(14).font("Helvetica-Bold").fillColor("#000").text("Personal Information");
    doc.moveDown(0.5);
    doc.fontSize(10).font("Helvetica").fillColor("#333")
      .text(`Name: ${candidate.fullName}`)
      .text(`CIN: ${candidate.cin}`)
      .text(`Email: ${candidate.email}`)
      .text(`Phone: ${candidate.phone}`);
    safeText(doc, `Governorate: ${candidate.governorate}`);
    safeText(doc, `Delegation: ${candidate.delegation}`);
    if (personalInfo) {
      const dateOfBirth = personalInfo.dateOfBirth as string;
      if (dateOfBirth) doc.text(`Date of Birth: ${new Date(dateOfBirth).toLocaleDateString()}`);
    }
    doc.moveDown();

    if (academicInfo) {
      doc.fontSize(14).font("Helvetica-Bold").fillColor("#000").text("Academic Information");
      doc.moveDown(0.5);
      const diplomas = academicInfo.diplomas as Array<Record<string, unknown>> | undefined;
      if (diplomas?.length) {
        diplomas.forEach((d, i) => {
          doc.fontSize(10).font("Helvetica").fillColor("#333")
            .text(`${i + 1}. ${d.diploma as string} - ${d.institution as string} (${d.graduationYear as number})`);
          safeText(doc, `   Level: ${d.studyLevel as string}, Grade: ${d.grade as string}`);
        });
      }
      doc.moveDown();
    }

    if (experienceInfo) {
      doc.fontSize(14).font("Helvetica-Bold").fillColor("#000").text("Professional Experience");
      doc.moveDown(0.5);
      const hasExp = experienceInfo.hasExperience as boolean;
      if (!hasExp) {
        doc.fontSize(10).font("Helvetica").fillColor("#333").text("No professional experience");
      } else {
        const experiences = experienceInfo.experiences as Array<Record<string, unknown>> | undefined;
        if (experiences?.length) {
          experiences.forEach((exp, i) => {
            doc.fontSize(10).font("Helvetica").fillColor("#333")
              .text(`${i + 1}. ${exp.position as string} @ ${exp.company as string}`)
              .text(`   ${new Date(exp.startDate as string).toLocaleDateString()} - ${exp.isCurrent ? "Present" : exp.endDate ? new Date(exp.endDate as string).toLocaleDateString() : "N/A"}`);
          });
        }
      }
      doc.moveDown();
    }

    if (application.documents.length > 0) {
      doc.fontSize(14).font("Helvetica-Bold").fillColor("#000").text("Documents");
      doc.moveDown(0.5);
      application.documents.forEach((docFile) => {
        doc.fontSize(10).font("Helvetica").fillColor("#333").text(`- ${docFile.fileName} (${docFile.type})`);
      });
    }

    if (application.scores.length > 0) {
      doc.addPage();
      doc.fontSize(14).font("Helvetica-Bold").fillColor("#000").text("Scores");
      doc.moveDown(0.5);
      let total = 0;
      application.scores.forEach((score) => {
        doc.fontSize(10).font("Helvetica").fillColor("#333")
          .text(`${score.criteria.name}: ${score.value} (weight: ${score.criteria.weight})`);
        total += score.value;
      });
      doc.moveDown();
      doc.fontSize(12).font("Helvetica-Bold").text(`Total Score: ${total}`);
    }

    doc.end();

    return new Promise<NextResponse>((resolve, reject) => {
      doc!.on("end", () => {
        if (errorOccurred) {
          reject(new Error("PDF generation failed"));
          return;
        }
        const pdfBuffer = Buffer.concat(chunks);
        resolve(new NextResponse(pdfBuffer, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="application-${application.id}.pdf"`,
            "Content-Length": pdfBuffer.length.toString(),
          },
        }));
      });
      
      doc!.on("error", (err) => {
        reject(err);
      });
    });
  } catch (error) {
    if (doc) {
      try {
        doc.end();
      } catch {
        // Ignore cleanup errors
      }
    }
    console.error("PDF generation failed:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
