export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
]);

const ALLOWED_EXTENSIONS = new Set(["pdf", "jpg", "jpeg", "png"]);

const MAX_SIZE = 5 * 1024 * 1024;

const ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

function sanitizeFileName(fileName: string): string {
  const name = path.basename(fileName);
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const base = name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${base}.${ext}`;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const candidateId = (formData.get("candidateId") as string) || "temp";

    const isTempUpload = candidateId === "temp";
    if (!session && !isTempUpload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session && !isTempUpload && candidateId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Only PDF, JPEG, and PNG allowed" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File size exceeds 5MB" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json({ error: "Invalid file extension" }, { status: 400 });
    }

    if (!ID_PATTERN.test(candidateId)) {
      return NextResponse.json({ error: "Invalid candidate ID" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const safeFileName = sanitizeFileName(file.name);
    const fileName = `${timestamp}-${randomStr}-${safeFileName}`;

    const uploadDir = path.join(process.cwd(), "uploads", isTempUpload ? "temp" : candidateId);
    
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const resolvedDir = path.resolve(uploadDir);
    const resolvedBase = path.resolve(process.cwd(), "uploads");
    
    if (!resolvedDir.startsWith(resolvedBase)) {
      return NextResponse.json({ error: "Invalid upload path" }, { status: 400 });
    }

    const filePath = path.join(resolvedDir, fileName);
    await writeFile(filePath, buffer);

    const relativePath = `/uploads/${isTempUpload ? "temp" : candidateId}/${fileName}`;

    return NextResponse.json({
      url: relativePath,
      fileName: safeFileName,
      size: file.size,
      mimeType: file.type,
    });
  } catch (error) {
    console.error("Upload failed:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}