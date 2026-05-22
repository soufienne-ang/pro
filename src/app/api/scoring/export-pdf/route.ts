export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { ApplicationStatus } from "@prisma/client";
import { prisma } from "@/server/prisma";
import PDFDocument from "pdfkit";

export async function GET(request: NextRequest) {
  let doc!: PDFKit.PDFDocument;
  
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "REVIEWER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");
    const status = searchParams.get("status");

    if (!jobId) {
      return NextResponse.json({ error: "jobId is required" }, { status: 400 });
    }

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { code: true, titleFr: true, titleAr: true },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const [criteria, applications] = await Promise.all([
      prisma.scoredCriteria.findMany({
        where: { jobId },
        orderBy: { id: "asc" },
      }),
      prisma.application.findMany({
        where: {
          jobId,
          ...(status ? { status: status as ApplicationStatus } : {}),
        },
        include: {
          candidate: {
            select: {
              fullName: true,
              email: true,
              cin: true,
              phone: true,
              governorate: true,
              delegation: true,
            },
          },
          scores: true,
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);

    const ranked = applications.map((app) => {
      const scoreMap = new Map(app.scores.map((s) => [s.criteriaId, s.value]));
      let totalWeighted = 0;
      for (const c of criteria) {
        const val = scoreMap.get(c.id) || 0;
        totalWeighted += val * (c.weight / totalWeight);
      }
      return {
        candidate: app.candidate,
        status: app.status,
        weightedScore: Math.round(totalWeighted * 100) / 100,
      };
    });

    ranked.sort((a, b) => b.weightedScore - a.weightedScore);

    doc = new PDFDocument({ margin: 30, size: "A4" });
    const chunks: Buffer[] = [];
    let errorOccurred = false;
    
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("error", (err) => {
      errorOccurred = true;
      console.error("PDFDocument error:", err);
    });

    doc.fontSize(18).text(`Results Report - ${job.titleFr || job.code}`, { align: "center" });
    doc.fontSize(10).text(`Job Code: ${job.code} | Generated: ${new Date().toLocaleDateString()}`, { align: "center" });
    doc.moveDown(1.5);

    const pageWidth = doc.page.width - 60;
    const colWidths = [40, 180, 120, 80, 80];
    const headers = ["Rank", "Candidate", "Email", "Score", "Status"];

    const drawHeader = (y: number) => {
      let x = 30;
      doc.fontSize(8).font("Helvetica-Bold");
      headers.forEach((h, i) => {
        doc.text(h, x, y, { width: colWidths[i], align: "left" });
        x += colWidths[i];
      });
      doc.moveTo(30, y + 14).lineTo(pageWidth + 30, y + 14).stroke();
    };

    let yPos = doc.y;
    drawHeader(yPos);
    yPos += 20;

    doc.fontSize(8).font("Helvetica");
    ranked.forEach((item, index) => {
      if (yPos > doc.page.height - 50) {
        doc.addPage();
        yPos = 30;
        drawHeader(yPos);
        yPos += 20;
      }

      let x = 30;
      doc.text(String(index + 1), x, yPos, { width: colWidths[0], align: "left" });
      x += colWidths[0];
      doc.text(item.candidate.fullName, x, yPos, { width: colWidths[1], align: "left" });
      x += colWidths[1];
      doc.text(item.candidate.email, x, yPos, { width: colWidths[2], align: "left" });
      x += colWidths[2];
      doc.text(String(item.weightedScore), x, yPos, { width: colWidths[3], align: "left" });
      x += colWidths[3];
      doc.text(item.status, x, yPos, { width: colWidths[4], align: "left" });

      yPos += 16;
    });

    doc.end();

    return new Promise<NextResponse>((resolve, reject) => {
      doc!.on("end", () => {
        if (errorOccurred) {
          reject(new Error("PDF generation failed"));
          return;
        }
        const pdfBuf = Buffer.concat(chunks);
        const filename = `results_report_${job.code}_${new Date().toISOString().split("T")[0]}.pdf`;
        resolve(new NextResponse(pdfBuf, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${filename}"`,
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
    console.error("Failed to export PDF:", error);
    return NextResponse.json({ error: "Failed to export PDF" }, { status: 500 });
  }
}
