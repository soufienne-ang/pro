export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requirePermission, isErrorResponse } from "@/lib/roles";
import { updateJobSchema } from "@/lib/schemas/jobs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const job = await prisma.job.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        titleFr: true,
        titleAr: true,
        descriptionFr: true,
        descriptionAr: true,
        location: true,
        jobType: true,
        profile: true,
        minEduLevel: true,
        dossierWeight: true,
        oralWeight: true,
        openings: true,
        deadline: true,
        status: true,
        requiredDocs: true,
        exclusionConditions: true,
        pdfUrl: true,
        imageUrl: true,
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json(job);
  } catch (error) {
    console.error("Failed to fetch job:", error);
    return NextResponse.json({ error: "Failed to fetch job" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission("manageJobs");
    if (isErrorResponse(user)) return user;

    const { id } = await params;
    const body = await request.json();

    const parsed = updateJobSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { deadline, pdfUrl, imageUrl, ...rest } = parsed.data;
    const job = await prisma.job.update({
      where: { id },
      data: {
        ...rest,
        ...(deadline ? { deadline: new Date(deadline) } : {}),
        pdfUrl: pdfUrl || null,
        imageUrl: imageUrl || null,
      },
    });

    await prisma.auditLog.create({
      data: {
        adminId: user.id,
        action: body.status ? "JOB_STATUS_CHANGED" : "JOB_UPDATED",
        entity: "job",
        entityId: id,
        details: body,
      },
    });

    return NextResponse.json(job);
  } catch (error) {
    console.error("Failed to update job:", error);
    return NextResponse.json({ error: "Failed to update job" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission("manageJobs");
    if (isErrorResponse(user)) return user;

    const { id } = await params;

    await prisma.job.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        adminId: user.id,
        action: "JOB_DELETED",
        entity: "job",
        entityId: id,
      },
    });

    return NextResponse.json({ message: "Job deleted" });
  } catch (error) {
    console.error("Failed to delete job:", error);
    return NextResponse.json({ error: "Failed to delete job" }, { status: 500 });
  }
}
