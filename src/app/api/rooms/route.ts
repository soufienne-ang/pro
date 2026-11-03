export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requirePermission, isErrorResponse } from "@/lib/roles";
import { z } from "zod";

const createRoomSchema = z.object({
  name: z.string().min(1),
  capacity: z.number().int().positive(),
  location: z.string().optional(),
  equipment: z.string().optional(),
});

export async function GET() {
  try {
    const user = await requirePermission("viewExams");
    if (isErrorResponse(user)) return user;

    const rooms = await prisma.room.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json(rooms);
  } catch (error) {
    console.error("Failed to fetch rooms:", error);
    return NextResponse.json({ error: "Failed to fetch rooms" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission("manageRooms");
    if (isErrorResponse(user)) return user;

    const body = await request.json();
    const validated = createRoomSchema.parse(body);

    const room = await prisma.room.create({
      data: validated,
    });

    await prisma.auditLog.create({
      data: {
        adminId: user.id,
        action: "ROOM_CREATED",
        entity: "Room",
        entityId: room.id,
        details: validated,
      },
    });

    return NextResponse.json(room, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map((err) => `${err.path.join(".")}: ${err.message}`).join(", ");
      return NextResponse.json({ error: messages }, { status: 400 });
    }
    console.error("Failed to create room:", error);
    return NextResponse.json({ error: "Failed to create room" }, { status: 500 });
  }
}
