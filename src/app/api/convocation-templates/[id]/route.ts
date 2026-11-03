export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requirePermission, isErrorResponse } from "@/lib/roles";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission("manageConvocations");
    if (isErrorResponse(user)) return user;

    const { id } = await params;

    const template = await prisma.convocationTemplate.findUnique({ where: { id } });
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error("Failed to fetch convocation template:", error);
    return NextResponse.json({ error: "Failed to fetch template" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission("manageConvocations");
    if (isErrorResponse(user)) return user;

    const { id } = await params;
    const body = await request.json();
    const { name, titleAr, titleFr, headerAr, headerFr, footerAr, footerFr, logoUrl, fields, isDefault, jobId } = body;

    const existing = await prisma.convocationTemplate.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    if (isDefault) {
      await prisma.convocationTemplate.updateMany({
        where: { id: { not: id } },
        data: { isDefault: false },
      });
    }

    if (jobId !== undefined) {
      await prisma.convocationTemplate.updateMany({
        where: { jobId, id: { not: id } },
        data: { jobId: null },
      });
    }

    const template = await prisma.convocationTemplate.update({
      where: { id },
      data: {
        name: name ?? existing.name,
        titleAr: titleAr ?? existing.titleAr,
        titleFr: titleFr ?? existing.titleFr,
        headerAr: headerAr !== undefined ? headerAr : existing.headerAr,
        headerFr: headerFr !== undefined ? headerFr : existing.headerFr,
        footerAr: footerAr !== undefined ? footerAr : existing.footerAr,
        footerFr: footerFr !== undefined ? footerFr : existing.footerFr,
        logoUrl: logoUrl !== undefined ? logoUrl : existing.logoUrl,
        fields: fields !== undefined ? fields : existing.fields,
        isDefault: isDefault !== undefined ? isDefault : existing.isDefault,
        jobId: jobId !== undefined ? (jobId || null) : existing.jobId,
      },
    });

    return NextResponse.json({ template });
  } catch (error) {
    console.error("Failed to update convocation template:", error);
    return NextResponse.json({ error: "Failed to update template" }, { status: 500 });
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

    await prisma.convocationTemplate.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        adminId: user.id,
        action: "CONVOCATION_TEMPLATE_DELETED",
        entity: "convocation_template",
        entityId: id,
      },
    });

    return NextResponse.json({ message: "Template deleted" });
  } catch (error) {
    console.error("Failed to delete convocation template:", error);
    return NextResponse.json({ error: "Failed to delete template" }, { status: 500 });
  }
}
