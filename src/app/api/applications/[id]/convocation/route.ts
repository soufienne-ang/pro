export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requirePermission, isErrorResponse } from "@/lib/roles";
import PDFDocument from "pdfkit";

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

    const candidate = application.candidate;
    const job = application.job;
    const personalInfo = application.personalInfo as Record<string, unknown> | null;
    const academicInfo = application.academicInfo as Record<string, unknown> | null;

    doc.fontSize(14).font("Helvetica-Bold").fillColor("#1a1a1a")
      .text("REPUBLIQUE TUNISIENNE", { align: "center" });
    doc.fontSize(11).font("Helvetica").fillColor("#333")
      .text("Ministere de la Jeunesse et des Sports", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(18).font("Helvetica-Bold").fillColor("#991b1b")
      .text("PROMOSPORT", { align: "center" });
    doc.moveDown(1.5);
    doc.fontSize(14).font("Helvetica-Bold").fillColor("#1a1a1a")
      .text("CONVOCATION", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor("#333")
      .text(job.titleFr, { align: "center" });
    doc.fontSize(10).font("Helvetica").fillColor("#666")
      .text("Code : " + job.code, { align: "center" });
    doc.moveDown(1.5);

    doc.moveTo(60, doc.y).lineTo(535, doc.y).strokeColor("#ccc").stroke();
    doc.moveDown(1);

    const civility = personalInfo?.gender === "FEMALE" ? "Madame" : "Monsieur";
    doc.fontSize(12).font("Helvetica-Bold").fillColor("#1a1a1a")
      .text("Merci " + civility + " " + candidate.fullName, { align: "center" });
    doc.fontSize(9).font("Helvetica").fillColor("#666")
      .text("Reference : " + application.id, { align: "center" });
    doc.moveDown(1.5);

    doc.fontSize(11).font("Helvetica-Bold").fillColor("#000")
      .text("Informations personnelles");
    doc.moveDown(0.3);
    doc.fontSize(10).font("Helvetica").fillColor("#333");
    doc.text("Nom et prenom : " + candidate.fullName);
    doc.text("Numero CIN : " + candidate.cin);
    doc.text("Email : " + candidate.email);
    doc.text("Telephone : " + candidate.phone);
    doc.text("Adresse : " + candidate.governorate + ", " + candidate.delegation);

    const diplomas = (academicInfo?.diplomas as Array<Record<string, unknown>> | undefined)?.filter(Boolean) || [];
    if (diplomas.length > 0) {
      const top = diplomas.sort((a, b) => (b.graduationYear as number) - (a.graduationYear as number))[0];
      if (top?.diploma) doc.text("Diplome : " + (top.diploma as string));
      if (top?.institution) doc.text("Institution : " + (top.institution as string));
    }

    doc.moveDown(1.5);

    if (job.requiredDocs) {
      doc.fontSize(11).font("Helvetica-Bold").fillColor("#000")
        .text("Documents obligatoires a fournir");
      doc.moveDown(0.3);
      doc.fontSize(9).font("Helvetica").fillColor("#555");
      for (const d of job.requiredDocs.split("\n").filter(Boolean)) {
        doc.text("  - " + d.trim());
      }
      doc.moveDown(1.5);
    }

    if (application.documents.length > 0) {
      doc.fontSize(11).font("Helvetica-Bold").fillColor("#000")
        .text("Documents telecharges");
      doc.moveDown(0.3);
      doc.fontSize(9).font("Helvetica").fillColor("#555");
      for (const f of application.documents) {
        doc.text("  - " + f.fileName);
      }
      doc.moveDown(1.5);
    }

    doc.moveTo(60, doc.y).lineTo(535, doc.y).strokeColor("#ccc").stroke();
    doc.moveDown(1);
    doc.fontSize(9).font("Helvetica").fillColor("#666")
      .text("Fait a Tunis, le " + new Date().toLocaleDateString("fr-FR"), { align: "right" });
    doc.moveDown(0.5);
    doc.text("Signature du candidat : _________________________", { align: "right" });

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
