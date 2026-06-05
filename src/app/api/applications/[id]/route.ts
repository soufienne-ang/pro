export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requirePermission, isErrorResponse } from "@/lib/roles";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission("viewApplications");
    if (isErrorResponse(user)) return user;

    const { id } = await params;

    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        candidate: true,
        job: true,
        documents: true,
        scores: {
          include: { criteria: true },
        },
        statusHistory: {
          orderBy: { changedAt: "desc" },
        },
      },
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    return NextResponse.json({ application });
  } catch (error) {
    console.error("Failed to fetch application:", error);
    return NextResponse.json({ error: "Failed to fetch application" }, { status: 500 });
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

    await prisma.application.delete({ where: { id } });

    return NextResponse.json({ message: "Application deleted" });
  } catch (error) {
    console.error("Failed to delete application:", error);
    return NextResponse.json({ error: "Failed to delete application" }, { status: 500 });
  }
}
