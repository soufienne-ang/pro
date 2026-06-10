export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { getCurrentUser } from "@/lib/roles";

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
]);

const ALLOWED_EXTENSIONS = new Set(["pdf", "jpg", "jpeg", "png"]);

const MAX_SIZE = 5 * 1024 * 1024;

const ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;
const TEMP_PREFIX = "temp:";

const USE_BLOB_STORAGE = !!process.env.BLOB_READ_WRITE_TOKEN;

function sanitizeFileName(fileName: string): string {
  const name = fileName.split(/[\\/]/).pop() || "file";
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const base = name
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 80);
  return `${base || "file"}.${ext}`;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const rawCandidateId = (formData.get("candidateId") as string) || "temp";
    const docType = (formData.get("type") as string) || "misc";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "Fichier vide" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Type de fichier invalide. Seuls PDF, JPEG, PNG sont acceptés." },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Le fichier dépasse la taille maximale de 5 Mo" },
        { status: 400 }
      );
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json({ error: "Extension de fichier invalide" }, { status: 400 });
    }

    const isTempUpload = rawCandidateId === "temp" || rawCandidateId.startsWith(TEMP_PREFIX);

    if (!user && !isTempUpload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user && !isTempUpload && rawCandidateId !== user.id && user.role === "CANDIDATE") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let resolvedCandidateId: string | null = null;
    if (!isTempUpload) {
      if (!ID_PATTERN.test(rawCandidateId)) {
        return NextResponse.json({ error: "Invalid candidate ID" }, { status: 400 });
      }
      const candidateExists = await prisma.candidate.findUnique({
        where: { id: rawCandidateId },
        select: { id: true },
      });
      if (!candidateExists) {
        return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
      }
      resolvedCandidateId = candidateExists.id;
    }

    const safeFileName = sanitizeFileName(file.name);
    let blobUrl = "";
    let buffer = Buffer.alloc(0);

    if (USE_BLOB_STORAGE) {
      const { put } = await import("@vercel/blob");
      const blob = await put(safeFileName, file, {
        access: "public",
        contentType: file.type,
        addRandomSuffix: true,
      });
      blobUrl = blob.url;
    } else {
      const bytes = await file.arrayBuffer();
      buffer = Buffer.from(bytes);
    }

    const document = await prisma.document.create({
      data: {
        candidateId: resolvedCandidateId,
        applicationId: null,
        type: docType,
        fileName: safeFileName,
        fileUrl: blobUrl,
        fileSize: file.size,
        mimeType: file.type,
        data: buffer,
      },
      select: { id: true },
    });

    const finalUrl = blobUrl || `/api/documents/${document.id}`;

    if (!blobUrl) {
      await prisma.document.update({
        where: { id: document.id },
        data: { fileUrl: finalUrl },
      });
    }

    return NextResponse.json({
      id: document.id,
      url: finalUrl,
      fileName: safeFileName,
      size: file.size,
      mimeType: file.type,
      type: docType,
      blob: USE_BLOB_STORAGE,
    });
  } catch (error) {
    console.error("Upload failed:", error);
    const message =
      error instanceof Error ? error.message : "Échec du téléchargement";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
