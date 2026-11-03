export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requirePermission, isErrorResponse } from "@/lib/roles";
import { z } from "zod";
import pkg from "bcryptjs";
var { hash } = pkg;

var createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  role: z.enum(["SUPER_ADMIN", "REVIEWER", "HR_AGENT", "JURY_MEMBER", "COMMISSION"]),
  isActive: z.boolean().optional().default(true),
});

export async function GET() {
  try {
    var user = await requirePermission("manageUsers");
    if (isErrorResponse(user)) return user;

    var admins = await prisma.admin.findMany({
      select: { id: true, email: true, name: true, role: true, isActive: true, lastLogin: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(admins);
  } catch (err) {
    console.error("GET /api/admin/users error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    var user = await requirePermission("manageUsers");
    if (isErrorResponse(user)) return user;

    var body = await request.json();
    var parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    var { email, password, name, role, isActive } = parsed.data;

    var existing = await prisma.admin.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }

    var hashed = await hash(password, 12);
    var admin = await prisma.admin.create({
      data: { email, password: hashed, name, role, isActive },
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
    });

    await prisma.auditLog.create({
      data: { adminId: user.id, action: "CREATE_USER", entity: "admin", entityId: admin.id, details: { email, role } },
    });

    return NextResponse.json(admin, { status: 201 });
  } catch (err) {
    console.error("POST /api/admin/users error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
