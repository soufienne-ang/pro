export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requirePermission, isErrorResponse } from "@/lib/roles";

export async function GET() {
  try {
    const user = await requirePermission("manageConvocations");
    if (isErrorResponse(user)) return user;

    const templates = await prisma.convocationTemplate.findMany({
      include: { job: { select: { id: true, code: true, titleAr: true, titleFr: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error("Failed to fetch convocation templates:", error);
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission("manageConvocations");
    if (isErrorResponse(user)) return user;

    const body = await request.json();
    const { name, titleAr, titleFr, headerAr, headerFr, footerAr, footerFr, logoUrl, fields, isDefault, jobId } = body;

    if (!name || !titleAr || !titleFr) {
      return NextResponse.json({ error: "name, titleAr, titleFr are required" }, { status: 400 });
    }

    if (isDefault) {
      await prisma.convocationTemplate.updateMany({ data: { isDefault: false } });
    }

    if (jobId) {
      await prisma.convocationTemplate.updateMany({
        where: { jobId },
        data: { jobId: null },
      });
    }

    const template = await prisma.convocationTemplate.create({
      data: {
        name,
        titleAr,
        titleFr,
        headerAr: headerAr || "",
        headerFr: headerFr || "",
        footerAr: footerAr || "",
        footerFr: footerFr || "",
        logoUrl: logoUrl || null,
        fields: fields || [],
        isDefault: isDefault || false,
        jobId: jobId || null,
      },
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error("Failed to create convocation template:", error);
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
  }
}
