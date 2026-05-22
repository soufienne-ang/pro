export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { prisma } from "@/server/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "CANDIDATE") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const candidateId = session.user.id;

    const applications = await prisma.application.findMany({
      where: { candidateId },
      include: {
        job: {
          select: {
            id: true,
            code: true,
            titleFr: true,
            titleAr: true,
            location: true,
            jobType: true,
            deadline: true,
            status: true,
          },
        },
        documents: {
          select: {
            id: true,
            type: true,
            fileName: true,
            fileUrl: true,
            uploadedAt: true,
          },
        },
        scores: {
          include: {
            criteria: {
              select: { name: true, weight: true },
            },
          },
        },
        statusHistory: {
          orderBy: { changedAt: "desc" },
          take: 5,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ applications });
  } catch (error) {
    console.error("Failed to fetch candidate applications:", error);
    return NextResponse.json({ error: "Failed to fetch applications" }, { status: 500 });
  }
}
