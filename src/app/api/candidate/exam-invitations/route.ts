export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { ROLES, requireRole, isErrorResponse } from "@/lib/roles";

export async function GET() {
  try {
    const user = await requireRole(ROLES.CANDIDATE);
    if (isErrorResponse(user)) return user;

    const candidateId = user.id;

    const examTypes = ["ORAL", "PRACTICAL", "SPORTS"];

    const results = await prisma.examResult.findMany({
      where: { candidateId },
      include: {
        session: {
          include: {
            exam: {
              select: { id: true, titleAr: true, titleFr: true, type: true, coefficient: true, duration: true },
            },
            room: { select: { id: true, name: true, location: true } },
          },
        },
      },
      orderBy: { session: { date: "desc" } },
    });

    const invitations = results
      .filter((r) => examTypes.includes(r.session.exam.type))
      .map((r) => ({
        resultId: r.id,
        examId: r.session.exam.id,
        examTitleAr: r.session.exam.titleAr,
        examTitleFr: r.session.exam.titleFr,
        examType: r.session.exam.type,
        coefficient: r.session.exam.coefficient,
        duration: r.session.exam.duration,
        sessionDate: r.session.date,
        startTime: r.session.startTime,
        endTime: r.session.endTime,
        sessionType: r.session.type,
        roomName: r.session.room?.name || null,
        roomLocation: r.session.room?.location || null,
        score: r.score,
        present: r.present,
      }));

    return NextResponse.json({ invitations });
  } catch (error) {
    console.error("Failed to fetch exam invitations:", error);
    return NextResponse.json({ error: "Failed to fetch exam invitations" }, { status: 500 });
  }
}
