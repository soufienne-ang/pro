export const dynamic = "force-dynamic";
export const revalidate = 60;

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { createJobSchema } from "@/lib/schemas/jobs";
import { requirePermission, isErrorResponse } from "@/lib/roles";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "PUBLISHED";

    const jobs = await prisma.job.findMany({
      where: {
        ...(status !== "ALL" ? { status: status as "DRAFT" | "PUBLISHED" | "CLOSED" } : {}),
      },
      select: {
        id: true,
        code: true,
        titleFr: true,
        titleAr: true,
        descriptionFr: true,
        descriptionAr: true,
        location: true,
        jobType: true,
        profile: true,
        minEduLevel: true,
        dossierWeight: true,
        oralWeight: true,
        openings: true,
        deadline: true,
        status: true,
        requiredDocs: true,
        exclusionConditions: true,
        pdfUrl: true,
        imageUrl: true,
        resultsPublished: true,
        resultsArchived: true,
        resultsPublishedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(jobs);
  } catch (error) {
    console.error("Failed to fetch jobs:", error);
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission("manageJobs");
    if (isErrorResponse(user)) return user;

    const body = await request.json();
    const validated = createJobSchema.parse(body);

    const job = await prisma.job.create({
      data: {
        code: validated.code,
        titleFr: validated.titleFr,
        titleAr: validated.titleAr,
        descriptionFr: validated.descriptionFr,
        descriptionAr: validated.descriptionAr,
        location: validated.location,
        jobType: validated.jobType,
        profile: validated.profile,
        minEduLevel: validated.minEduLevel,
        dossierWeight: validated.dossierWeight,
        oralWeight: validated.oralWeight,
        openings: validated.openings,
        deadline: new Date(validated.deadline),
        requiredDocs: validated.requiredDocs,
        exclusionConditions: validated.exclusionConditions,
        pdfUrl: validated.pdfUrl,
        imageUrl: validated.imageUrl,
        status: validated.status,
      },
    });

    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map((err) => `${err.path.join(".")}: ${err.message}`).join(", ");
      return NextResponse.json({ error: messages }, { status: 400 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = (error.meta?.target as string[])?.join(", ") || "code";
      return NextResponse.json(
        { error: `A job with this ${target} already exists` },
        { status: 409 }
      );
    }
    console.error("Failed to create job:", error);
    const message = error instanceof Error ? error.message : "Failed to create job";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}