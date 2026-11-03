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
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get("templateId");

    const application = await prisma.application.findUnique({
      where: { id },
      select: { candidateId: true },
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const isStaff = hasPermission(user.role, "generateConvocation");
    const isOwner = user.id === application.candidateId;
    if (!isStaff && !isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const pdfBuffer = await generateConvocationPdf(id, templateId || null);

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invitation-${id}.pdf"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Convocation error:", error);
    return NextResponse.json({
      error: "Failed to generate convocation: " + (error instanceof Error ? error.message : "Unknown")
    }, { status: 500 });
  }
}
