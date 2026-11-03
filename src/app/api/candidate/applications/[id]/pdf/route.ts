export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireUser, isErrorResponse, hasPermission } from "@/lib/roles";
import { generateApplicationPdf } from "@/server/generate-application-pdf";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    var user = await requireUser();
    if (isErrorResponse(user)) return user;

    var { id } = await params;

    var application = await prisma.application.findUnique({
      where: { id },
      select: { candidateId: true },
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    var isStaff = hasPermission(user.role, "generateConvocation");
    var isOwner = user.id === application.candidateId;
    if (!isStaff && !isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    var pdfBuf = await generateApplicationPdf(id);

    return new NextResponse(pdfBuf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="demande.pdf"',
        "Content-Length": pdfBuf.length.toString(),
      },
    });
  } catch (err) {
    console.error("Convocation PDF error:", err);
    return NextResponse.json({
      error: "Failed: " + ((err instanceof Error) ? err.message : "Unknown")
    }, { status: 500 });
  }
}
