export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requirePermission, isErrorResponse } from "@/lib/roles";

export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission("viewCandidates");
    if (isErrorResponse(user)) return user;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const jobId = searchParams.get("jobId") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { email: { contains: search } },
        { cin: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    if (jobId) {
      where.applications = { some: { jobId } };
    }

    const [candidates, total] = await Promise.all([
      prisma.candidate.findMany({
        where,
        select: {
          id: true,
          fullName: true,
          email: true,
          cin: true,
          phone: true,
          governorate: true,
          delegation: true,
          isEmailVerified: true,
          hasExperience: true,
          createdAt: true,
          _count: {
            select: { applications: true },
          },
          applications: {
            where: jobId ? { jobId } : undefined,
            select: {
              job: { select: { id: true, code: true, titleAr: true, titleFr: true } },
            },
            take: 1,
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.candidate.count({ where }),
    ]);

    const candidateIds = candidates.map(c => c.id);

    let docCountMap = new Map<string, number>();

    if (candidateIds.length > 0) {
      const [directDocCounts, appLinkedDocs] = await Promise.all([
        prisma.document.groupBy({
          by: ["candidateId"],
          _count: { id: true },
          where: { candidateId: { in: candidateIds } },
        }),
        prisma.document.findMany({
          where: {
            candidateId: null,
            application: { candidateId: { in: candidateIds } },
          },
          select: { application: { select: { candidateId: true } } },
        }),
      ]);

      docCountMap = new Map<string, number>();
      for (const c of directDocCounts) {
        if (c.candidateId) docCountMap.set(c.candidateId, c._count.id);
      }
      for (const doc of appLinkedDocs) {
        const cid = doc.application!.candidateId;
        docCountMap.set(cid, (docCountMap.get(cid) || 0) + 1);
      }
    }

    const result = candidates.map(c => ({
      ...c,
      _count: { ...c._count, documents: docCountMap.get(c.id) || 0 },
      applicationJob: c.applications?.[0]?.job || null,
      applications: undefined,
    }));

    return NextResponse.json({
      candidates: result,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Failed to fetch candidates:", error);
    return NextResponse.json({ error: "Failed to fetch candidates" }, { status: 500 });
  }
}
