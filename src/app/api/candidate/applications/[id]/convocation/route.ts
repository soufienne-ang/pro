export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireUser, isErrorResponse, hasPermission } from "@/lib/roles";
import { generateConvocationPdf } from "@/server/generate-convocation-pdf";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    if (isErrorResponse(user)) return user;

    const { id } = await params;

    const application = await prisma.application.findUnique({
      where: { id },
      select: {
        candidateId: true,
        jobId: true,
        status: true,
      },
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const isStaff = hasPermission(user.role, "generateConvocation");
    const isOwner = user.id === application.candidateId;
    if (!isStaff && !isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let templateId: string | null = null;
    if (application.status === "ORAL_TEST") {
      const jobTemplate = await prisma.convocationTemplate.findUnique({
        where: { jobId: application.jobId },
        select: { id: true },
      });
      if (jobTemplate) {
        templateId = jobTemplate.id;
      } else {
        const defaultTemplate = await prisma.convocationTemplate.findFirst({
          where: { isDefault: true },
          select: { id: true },
        });
        if (defaultTemplate) {
          templateId = defaultTemplate.id;
        }
      }
    }

    const pdfBuf = await generateConvocationPdf(id, templateId);

    return new NextResponse(pdfBuf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="convocation-${id}.pdf"`,
        "Content-Length": pdfBuf.length.toString(),
      },
    });
  } catch (error) {
    console.error("Candidate convocation download error:", error);
    return NextResponse.json({ error: "Failed to download convocation" }, { status: 500 });
  }
}
