export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission, isErrorResponse } from "@/lib/roles";
import { prisma } from "@/server/prisma";

const ALLOWED_EXTS: Record<string, string[]> = {
  pdf: ["pdf"],
  image: ["jpg", "jpeg", "png"],
};

const ALLOWED_MIMES: Record<string, string[]> = {
  pdf: ["application/pdf"],
  image: ["image/jpeg", "image/png"],
};

const MAX_SIZE = 10 * 1024 * 1024;
const USE_BLOB_STORAGE = !!process.env.BLOB_READ_WRITE_TOKEN;

function isValidType(type: string, file: File): boolean {
  const exts = ALLOWED_EXTS[type] || ALLOWED_EXTS.pdf;
  const mimes = ALLOWED_MIMES[type] || ALLOWED_MIMES.pdf;
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (ext && exts.includes(ext)) return true;
  if (file.type && mimes.includes(file.type)) return true;
  return false;
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission("manageJobs");
    if (isErrorResponse(user)) return user;

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!isValidType(type, file)) {
      return NextResponse.json({ error: "Type de fichier invalide" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Fichier trop volumineux (max 10 Mo)" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || (type === "pdf" ? "pdf" : "png");

    if (USE_BLOB_STORAGE) {
      const { put } = await import("@vercel/blob");
      const blob = await put(`jobs/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`, file, {
        access: "public",
        contentType: file.type,
        addRandomSuffix: true,
      });
      return NextResponse.json({ url: blob.url, fileName: blob.pathname });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const doc = await prisma.document.create({
      data: {
        candidateId: null,
        applicationId: null,
        type: `job_${type}`,
        fileName: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`,
        fileUrl: "",
        fileSize: file.size,
        mimeType: file.type,
        data: buffer,
      },
      select: { id: true, fileName: true },
    });

    const url = `/api/documents/${doc.id}`;

    await prisma.document.update({
      where: { id: doc.id },
      data: { fileUrl: url },
    });

    return NextResponse.json({ url, fileName: doc.fileName });
  } catch (error) {
    console.error("Job upload failed:", error);
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
