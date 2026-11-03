export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requirePermission, isErrorResponse } from "@/lib/roles";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/jpg", "image/png"]);
const MAX_SIZE = 2 * 1024 * 1024;
const USE_BLOB_STORAGE = !!process.env.BLOB_READ_WRITE_TOKEN;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission("manageConvocations");
    if (isErrorResponse(user)) return user;

    const { id } = await params;

    const existing = await prisma.convocationTemplate.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Only JPEG and PNG images are accepted" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Image must be under 2MB" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const fileName = `convocation-logo-${id}.${ext}`;

    let logoUrl: string;

    if (USE_BLOB_STORAGE) {
      const { put } = await import("@vercel/blob");
      const blob = await put(`logos/${fileName}`, file, {
        access: "public",
        contentType: file.type,
        addRandomSuffix: false,
      });
      logoUrl = blob.url;
    } else {
      const uploadDir = path.join(process.cwd(), "public", "uploads", "logos");
      const filePath = path.join(uploadDir, fileName);

      await mkdir(uploadDir, { recursive: true });

      const bytes = await file.arrayBuffer();
      await writeFile(filePath, Buffer.from(bytes));

      logoUrl = `/uploads/logos/${fileName}`;
    }

    await prisma.convocationTemplate.update({
      where: { id },
      data: { logoUrl },
    });

    return NextResponse.json({ logoUrl });
  } catch (error) {
    console.error("Failed to upload logo:", error);
    return NextResponse.json({ error: "Failed to upload logo" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission("manageConvocations");
    if (isErrorResponse(user)) return user;

    const { id } = await params;

    const existing = await prisma.convocationTemplate.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    await prisma.convocationTemplate.update({
      where: { id },
      data: { logoUrl: null },
    });

    return NextResponse.json({ message: "Logo removed" });
  } catch (error) {
    console.error("Failed to remove logo:", error);
    return NextResponse.json({ error: "Failed to remove logo" }, { status: 500 });
  }
}
