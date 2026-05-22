export const dynamic = "force-dynamic";
export const revalidate = 60;

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { z } from "zod";
import { createJobSchema } from "@/lib/schemas/jobs";

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
        openings: true,
        deadline: true,
        status: true,
        requiredDocs: true,
        pdfUrl: true,
        imageUrl: true,
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
        openings: validated.openings,
        deadline: new Date(validated.deadline),
        requiredDocs: validated.requiredDocs,
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
    console.error("Failed to create job:", error);
    return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
  }
}