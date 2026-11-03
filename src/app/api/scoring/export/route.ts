export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { ApplicationStatus } from "@prisma/client";
import { prisma } from "@/server/prisma";
import * as XLSX from "xlsx";
import { ensureScoringCriteria, computeDossierScore, combineTotalScore, criteriaForJob } from "@/server/scoring";
import { requirePermission, isErrorResponse } from "@/lib/roles";

export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission("exportResults");
    if (isErrorResponse(user)) return user;

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");
    const status = searchParams.get("status");

    if (!jobId) {
      return NextResponse.json({ error: "jobId is required" }, { status: 400 });
    }

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { code: true, titleFr: true, titleAr: true, profile: true, dossierWeight: true, oralWeight: true },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    await ensureScoringCriteria(jobId, job.profile);

    const [criteria, applications] = await Promise.all([
      prisma.scoredCriteria.findMany({
        where: { jobId },
        orderBy: { id: "asc" },
      }),
      prisma.application.findMany({
        where: {
          jobId,
          ...(status ? { status: status as ApplicationStatus } : {}),
        },
        include: {
          candidate: {
            select: {
              fullName: true,
              email: true,
              cin: true,
              phone: true,
              governorate: true,
              delegation: true,
              dateOfBirth: true,
              gender: true,
            },
          },
          scores: true,
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const rows = applications.map((app) => {
      const scoreMap = new Map(app.scores.map((s) => [s.criteriaId, s.value]));
      const row: Record<string, string | number> = {
        "Full Name": app.candidate.fullName,
        Email: app.candidate.email,
        CIN: app.candidate.cin,
        Phone: app.candidate.phone,
        Governorate: app.candidate.governorate,
        Delegation: app.candidate.delegation,
        Status: app.status,
      };

      const jobCriteria = criteriaForJob(job);

      let oralTotal = 0;
      for (const c of criteria) {
        const val = scoreMap.get(c.id) || 0;
        const label = jobCriteria.find(fc => fc.nameKey === c.name)?.labelFr || c.name;
        row[label] = val;
        oralTotal += val;
      }

      const dossier = computeDossierScore({
        academicInfo: app.academicInfo,
        profile: job.profile,
        eduLevel: app.eduLevel,
      });
      row["Oral Total"] = Math.round(oralTotal * 100) / 100;
      row["Dossier"] = dossier;
      row["Total"] = combineTotalScore(dossier, oralTotal, job);
      return row;
    });

    rows.sort((a, b) => Number(b["Total"] ?? 0) - Number(a["Total"] ?? 0));
    rows.forEach((row, i) => { row["Rank"] = i + 1; });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Results");

    const colWidths = Object.keys(rows[0] || {}).map((k) => ({
      wch: Math.max(k.length, 15),
    }));
    ws["!cols"] = colWidths;

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const filename = `results_${job.code}_${new Date().toISOString().split("T")[0]}.xlsx`;

    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Failed to export:", error);
    return NextResponse.json({ error: "Failed to export" }, { status: 500 });
  }
}
