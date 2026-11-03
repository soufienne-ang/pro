export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requirePermission, isErrorResponse } from "@/lib/roles";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission("viewCandidates");
    if (isErrorResponse(user)) return user;

    const { id } = await params;

    const candidate = await prisma.candidate.findUnique({
      where: { id },
      include: {
        _count: { select: { applications: true, documents: true } },
      },
    });

    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    return NextResponse.json(candidate);
  } catch (error) {
    console.error("Failed to fetch candidate:", error);
    return NextResponse.json({ error: "Failed to fetch candidate" }, { status: 500 });
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

    const allowedFields = [
      "fullName", "email", "phone", "governorate", "delegation",
      "address", "isEmailVerified", "hasExperience", "smsOptIn",
    ];

    const data: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        data[field] = body[field];
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const updated = await prisma.candidate.update({
      where: { id },
      data,
    });

    await prisma.auditLog.create({
      data: {
        adminId: user.id,
        action: "UPDATE_CANDIDATE",
        entity: "Candidate",
        entityId: id,
        details: { updated: Object.keys(data) },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update candidate:", error);
    return NextResponse.json({ error: "Failed to update candidate" }, { status: 500 });
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

    await prisma.candidate.delete({ where: { id } });

    return NextResponse.json({ message: "Candidate deleted" });
  } catch (error) {
    console.error("Failed to delete candidate:", error);
    return NextResponse.json({ error: "Failed to delete candidate" }, { status: 500 });
  }
}
