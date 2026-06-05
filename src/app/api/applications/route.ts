export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Gender, Prisma, StudyLevel } from "@prisma/client";
import { prisma } from "@/server/prisma";
import { z } from "zod";
import { applicationFilterSchema } from "@/lib/schemas/jobs";
import { ROLES, requirePermission, requireRole, isErrorResponse } from "@/lib/roles";

const applicationFileSchema = z.object({
  type: z.string(),
  fileName: z.string(),
  fileUrl: z.string(),
  fileSize: z.number().positive(),
  mimeType: z.string(),
});

const diplomaSchema = z.object({
  studyLevel: z.string(),
  diploma: z.string(),
  institution: z.string(),
  grade: z.string().optional().default(""),
  graduationYear: z.coerce.number().int().positive(),
});

const experienceSchema = z.object({
  company: z.string(),
  position: z.string(),
  startDate: z.string(),
  endDate: z.string().nullable().optional(),
  isCurrent: z.boolean().optional().default(false),
  description: z.string().optional().default(""),
});

function extractDocumentId(fileUrl: string): string | null {
  if (!fileUrl) return null;
  const match = fileUrl.match(/\/api\/documents\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

const createApplicationSchema = z.object({
  personalInfo: z.object({
    fullName: z.string().min(1),
    cin: z.string().length(8),
    email: z.string().email(),
    dateOfBirth: z.string(),
    gender: z.enum(["MALE", "FEMALE"]),
    phone: z.string(),
    governorate: z.string(),
    delegation: z.string(),
  }),
  jobSelection: z.object({
    jobId: z.string(),
  }),
  academicInfo: z.object({
    diplomas: z.array(diplomaSchema).optional(),
  }).optional(),
  experienceInfo: z.object({
    hasExperience: z.boolean().optional().default(false),
    experiences: z.array(experienceSchema).optional(),
  }).optional(),
  documents: z.object({
    files: z.array(applicationFileSchema).optional().default([]),
  }).optional(),
  termsAccepted: z.boolean().refine((v) => v === true),
  certificationSigned: z.boolean().refine((v) => v === true),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission("viewApplications");
    if (isErrorResponse(user)) return user;

    const { searchParams } = new URL(request.url);
    const validated = applicationFilterSchema.parse(Object.fromEntries(searchParams.entries()));

    const where: Prisma.ApplicationWhereInput = {};
    if (validated.jobId) where.jobId = validated.jobId;
    if (validated.status) where.status = validated.status;

    const candidateWhere: Prisma.CandidateWhereInput = {};
    if (validated.governorate) candidateWhere.governorate = validated.governorate;
    if (validated.search) {
      candidateWhere.OR = [
        { fullName: { contains: validated.search } },
        { cin: { contains: validated.search } },
      ];
    }
    if (Object.keys(candidateWhere).length > 0) {
      where.candidate = candidateWhere;
    }

    const applications = await prisma.application.findMany({
      where,
      include: {
        candidate: {
          select: {
            id: true,
            fullName: true,
            email: true,
            cin: true,
            phone: true,
            governorate: true,
            delegation: true,
          },
        },
        job: {
          select: {
            id: true,
            code: true,
            titleFr: true,
            titleAr: true,
          },
        },
        documents: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (validated.page - 1) * validated.limit,
      take: validated.limit,
    });

    const total = await prisma.application.count({ where });

    return NextResponse.json({
      applications,
      pagination: {
        page: validated.page,
        limit: validated.limit,
        total,
        pages: Math.ceil(total / validated.limit),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Failed to fetch applications:", error);
    return NextResponse.json({ error: "Failed to fetch applications" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(ROLES.CANDIDATE);
    if (isErrorResponse(user)) return user;

    const body = await request.json();
    const validated = createApplicationSchema.parse(body);

    const candidateId = user.id;

    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
    });

    if (!candidate) {
      return NextResponse.json(
        { error: "Candidate not found. Please register first." },
        { status: 404 }
      );
    }

    const existingApplication = await prisma.application.findUnique({
      where: {
        candidateId_jobId: {
          candidateId,
          jobId: validated.jobSelection.jobId,
        },
      },
    });

    const validStudyLevels = new Set<string>(Object.values(StudyLevel));

    let application;

    if (existingApplication) {
      await prisma.document.updateMany({
        where: { applicationId: existingApplication.id },
        data: { applicationId: null },
      });
      const connectIds = (validated.documents?.files || [])
        .map((file) => extractDocumentId(file.fileUrl))
        .filter((id): id is string => typeof id === "string" && id.length > 0);
      application = await prisma.application.update({
        where: { id: existingApplication.id },
        data: {
          status: "PENDING",
          personalInfo: validated.personalInfo,
          academicInfo: validated.academicInfo ?? undefined,
          experienceInfo: validated.experienceInfo ?? undefined,
          submittedAt: new Date(),
          documents: {
            connect: connectIds.map((id) => ({ id })),
          },
        },
        include: {
          candidate: true,
          job: true,
          documents: true,
        },
      });
    } else {
      const connectIds = (validated.documents?.files || [])
        .map((file) => extractDocumentId(file.fileUrl))
        .filter((id): id is string => typeof id === "string" && id.length > 0);
      application = await prisma.application.create({
        data: {
          candidateId,
          jobId: validated.jobSelection.jobId,
          status: "PENDING",
          personalInfo: validated.personalInfo,
          academicInfo: validated.academicInfo ?? undefined,
          experienceInfo: validated.experienceInfo ?? undefined,
          submittedAt: new Date(),
          documents: {
            connect: connectIds.map((id) => ({ id })),
          },
        },
        include: {
          candidate: true,
          job: true,
          documents: true,
        },
      });
    }

    if (validated.academicInfo?.diplomas?.length) {
      const diplomaRows = validated.academicInfo.diplomas
        .filter((d) => validStudyLevels.has(d.studyLevel) && d.diploma && d.institution)
        .map((d) => ({
          candidateId,
          studyLevel: d.studyLevel as StudyLevel,
          diploma: d.diploma,
          institution: d.institution,
          grade: d.grade || "",
          graduationYear: d.graduationYear,
        }));

      if (diplomaRows.length > 0) {
        await prisma.diploma.createMany({ data: diplomaRows });
      }
    }

    if (validated.experienceInfo?.hasExperience && validated.experienceInfo?.experiences?.length) {
      const experienceRows = validated.experienceInfo.experiences
        .filter((exp) => exp.company && exp.position && exp.startDate)
        .map((exp) => ({
          candidateId,
          company: exp.company,
          position: exp.position,
          startDate: new Date(exp.startDate),
          endDate: exp.endDate ? new Date(exp.endDate) : null,
          isCurrent: exp.isCurrent,
          description: exp.description || "",
        }));

      if (experienceRows.length > 0) {
        await prisma.experience.createMany({ data: experienceRows });
      }
    }

    await prisma.candidate.update({
      where: { id: candidateId },
      data: {
        fullName: validated.personalInfo.fullName,
        cin: validated.personalInfo.cin,
        dateOfBirth: new Date(validated.personalInfo.dateOfBirth),
        gender: validated.personalInfo.gender as Gender,
        phone: validated.personalInfo.phone,
        governorate: validated.personalInfo.governorate,
        delegation: validated.personalInfo.delegation,
        hasExperience: validated.experienceInfo?.hasExperience || false,
        currentStep: 8,
      },
    });

    return NextResponse.json(application, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map((err) => `${err.path.join(".")}: ${err.message}`).join(", ");
      return NextResponse.json({ error: messages }, { status: 400 });
    }
    console.error("Failed to create application:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create application";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}