export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { prisma } from "@/server/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "REVIEWER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
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
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.candidate.count({ where }),
    ]);

    return NextResponse.json({
      candidates,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Failed to fetch candidates:", error);
    return NextResponse.json({ error: "Failed to fetch candidates" }, { status: 500 });
  }
}
