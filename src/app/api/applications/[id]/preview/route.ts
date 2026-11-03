export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireUser, isErrorResponse } from "@/lib/roles";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    if (isErrorResponse(user)) return user;

    const { id } = await params;

    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        candidate: true,
        job: true,
        documents: true,
      },
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const isOwner = user.id === application.candidateId;
    const isStaff = ["SUPER_ADMIN", "HR_AGENT", "JURY_MEMBER", "COMMISSION", "REVIEWER"].includes(user.role);

    if (!isOwner && !isStaff) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      application: {
        id: application.id,
        status: application.status,
        submittedAt: application.submittedAt,
        personalInfo: application.personalInfo,
        academicInfo: application.academicInfo,
        experienceInfo: application.experienceInfo,
        candidate: {
          fullName: application.candidate.fullName,
          email: application.candidate.email,
          phone: application.candidate.phone,
          cin: application.candidate.cin,
          governorate: application.candidate.governorate,
          delegation: application.candidate.delegation,
        },
        job: {
          titleFr: application.job.titleFr,
          titleAr: application.job.titleAr,
          code: application.job.code,
        },
        documents: application.documents.map(d => ({
          fileName: d.fileName,
          type: d.type,
          mimeType: d.mimeType,
          fileSize: d.fileSize,
        })),
      },
    });
  } catch (error) {
    console.error("Failed to preview application:", error);
    return NextResponse.json({ error: "Failed to preview application" }, { status: 500 });
  }
}
