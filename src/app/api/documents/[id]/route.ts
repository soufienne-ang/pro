export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { getCurrentUser, isErrorResponse } from "@/lib/roles";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const doc = await prisma.document.findUnique({
      where: { id },
      select: {
        id: true,
        candidateId: true,
        applicationId: true,
        fileName: true,
        fileSize: true,
        mimeType: true,
        data: true,
        fileUrl: true,
      },
    });

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (doc.fileUrl && doc.fileUrl.startsWith("https://")) {
      return NextResponse.redirect(doc.fileUrl, 302);
    }

    const user = await getCurrentUser();
    if (isErrorResponse(user)) {
      return new NextResponse(doc.data as unknown as BodyInit, {
        status: 200,
        headers: {
          "Content-Type": doc.mimeType,
          "Content-Length": doc.fileSize.toString(),
          "Content-Disposition": `inline; filename="${doc.fileName}"`,
          "Cache-Control": "private, max-age=300",
        },
      });
    }

    const isOwner = user?.id && doc.candidateId === user.id;
    const isStaff =
      user?.role &&
      ["SUPER_ADMIN", "HR_AGENT", "JURY_MEMBER", "COMMISSION", "REVIEWER"].includes(user.role);

    if (!isOwner && !isStaff) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return new NextResponse(doc.data as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": doc.mimeType,
        "Content-Length": doc.fileSize.toString(),
        "Content-Disposition": `inline; filename="${doc.fileName}"`,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    console.error("Document fetch failed:", error);
    return NextResponse.json({ error: "Failed to fetch document" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (isErrorResponse(user) || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const doc = await prisma.document.findUnique({
      where: { id },
      select: { id: true, candidateId: true, applicationId: true, fileUrl: true },
    });

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const isOwner = doc.candidateId === user.id && user.role === "CANDIDATE";
    const isAdmin = user.role === "SUPER_ADMIN";
    const canDeleteTemp = !doc.candidateId && !doc.applicationId;

    if (!isOwner && !isAdmin && !canDeleteTemp) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (doc.fileUrl && doc.fileUrl.startsWith("https://") && isAdmin) {
      try {
        const { del } = await import("@vercel/blob");
        await del(doc.fileUrl);
      } catch (e) {
        console.error("Failed to delete blob:", e);
      }
    }

    await prisma.document.delete({ where: { id } });
    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    console.error("Document delete failed:", error);
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}
