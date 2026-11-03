export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requirePermission, isErrorResponse } from "@/lib/roles";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("viewCandidates");
    if (isErrorResponse(user)) return user;

    const p = await params;
    const candidate = await prisma.candidate.findUnique({
      where: { id: p.id },
      select: { id: true, fullName: true, cin: true },
    });

    if (!candidate) {
      return NextResponse.json({ error: "Candidat introuvable" }, { status: 404 });
    }

    const documents = await prisma.document.findMany({
      where: {
        OR: [
          { candidateId: p.id },
          { application: { candidateId: p.id } },
        ],
      },
      orderBy: { uploadedAt: "desc" },
      select: {
        id: true,
        type: true,
        fileName: true,
        fileUrl: true,
        fileSize: true,
        mimeType: true,
        uploadedAt: true,
        application: { select: { job: { select: { code: true, titleFr: true, titleAr: true } } } },
      },
    });

    return NextResponse.json({ candidate, documents });
  } catch (error) {
    console.error("Failed to fetch candidate documents:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
