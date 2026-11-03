export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requirePermission, isErrorResponse } from "@/lib/roles";
import { z } from "zod";
import pkg from "bcryptjs";
var { hash } = pkg;

var updateSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(["SUPER_ADMIN", "REVIEWER", "HR_AGENT", "JURY_MEMBER", "COMMISSION"]).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    var user = await requirePermission("manageUsers");
    if (isErrorResponse(user)) return user;

    var { id } = await params;
    var admin = await prisma.admin.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, role: true, isActive: true, lastLogin: true, createdAt: true },
    });

    if (!admin) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(admin);
  } catch (err) {
    console.error("GET /api/admin/users/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    var user = await requirePermission("manageUsers");
    if (isErrorResponse(user)) return user;

    var { id } = await params;
    var body = await request.json();
    var parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    var existing = await prisma.admin.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    var data: Record<string, unknown> = {};
    if (parsed.data.name) data.name = parsed.data.name;
    if (parsed.data.role) data.role = parsed.data.role;
    if (parsed.data.isActive !== undefined) data.isActive = parsed.data.isActive;
    if (parsed.data.password) data.password = await hash(parsed.data.password, 12);

    var updated = await prisma.admin.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, role: true, isActive: true, lastLogin: true, createdAt: true },
    });

    await prisma.auditLog.create({
      data: { adminId: user.id, action: "UPDATE_USER", entity: "admin", entityId: id, details: parsed.data },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PUT /api/admin/users/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    var user = await requirePermission("manageUsers");
    if (isErrorResponse(user)) return user;

    var { id } = await params;

    if (id === user.id) {
      return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
    }

    var existing = await prisma.admin.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await prisma.admin.delete({ where: { id } });

    await prisma.auditLog.create({
      data: { adminId: user.id, action: "DELETE_USER", entity: "admin", entityId: id, details: { email: existing.email } },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/admin/users/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
