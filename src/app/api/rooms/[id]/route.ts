export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requirePermission, isErrorResponse } from "@/lib/roles";
import { z } from "zod";

const updateRoomSchema = z.object({
  name: z.string().min(1).optional(),
  capacity: z.number().int().positive().optional(),
  location: z.string().optional(),
  equipment: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const room = await prisma.room.findUnique({
      where: { id },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    return NextResponse.json(room);
  } catch (error) {
    console.error("Failed to fetch room:", error);
    return NextResponse.json({ error: "Failed to fetch room" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission("manageRooms");
    if (isErrorResponse(user)) return user;

    const { id } = await params;
    const body = await request.json();
    const validated = updateRoomSchema.parse(body);

    const room = await prisma.room.update({
      where: { id },
      data: validated,
    });

    await prisma.auditLog.create({
      data: {
        adminId: user.id,
        action: "ROOM_UPDATED",
        entity: "Room",
        entityId: id,
        details: validated,
      },
    });

    return NextResponse.json(room);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map((err) => `${err.path.join(".")}: ${err.message}`).join(", ");
      return NextResponse.json({ error: messages }, { status: 400 });
    }
    console.error("Failed to update room:", error);
    return NextResponse.json({ error: "Failed to update room" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission("manageRooms");
    if (isErrorResponse(user)) return user;

    const { id } = await params;

    await prisma.room.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        adminId: user.id,
        action: "ROOM_DELETED",
        entity: "Room",
        entityId: id,
      },
    });

    return NextResponse.json({ message: "Room deleted" });
  } catch (error) {
    console.error("Failed to delete room:", error);
    return NextResponse.json({ error: "Failed to delete room" }, { status: 500 });
  }
}
