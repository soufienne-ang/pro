export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import * as XLSX from "xlsx";
import { requirePermission, isErrorResponse } from "@/lib/roles";
import { ApplicationStatus } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission("importApplications");
    if (isErrorResponse(user)) return user;

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(bytes), { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const statusMap: Record<string, string> = {
      "brouillon": "DRAFT", "draft": "DRAFT",
      "en attente": "PENDING", "pending": "PENDING", "PENDING": "PENDING",
      "en cours": "UNDER_REVIEW", "under_review": "UNDER_REVIEW", "UNDER_REVIEW": "UNDER_REVIEW",
      "approuvé": "APPROVED", "approved": "APPROVED", "APPROVED": "APPROVED",
      "rejeté": "REJECTED", "rejected": "REJECTED", "REJECTED": "REJECTED",
      "oral": "ORAL_TEST", "oral_test": "ORAL_TEST", "ORAL_TEST": "ORAL_TEST",
      "liste finale": "FINAL_LIST", "final_list": "FINAL_LIST", "FINAL_LIST": "FINAL_LIST",
    };

    const results = { created: 0, skipped: 0, errors: [] as string[] };

    for (const row of rows) {
      const r = row as Record<string, unknown>;
      const cin = String(r["CIN"] || r["cin"] || "").trim();
      const jobCode = String(r["Code poste"] || r["jobCode"] || "").trim();
      const statusRaw = String(r["Statut"] || r["status"] || "En attente").trim().toLowerCase();
      const status = statusMap[statusRaw] || "PENDING";

      if (!cin || !jobCode) {
        results.skipped++;
        results.errors.push(`Ligne ignorée: CIN ou code poste manquant`);
        continue;
      }

      const candidate = await prisma.candidate.findFirst({ where: { cin } });
      if (!candidate) {
        results.skipped++;
        results.errors.push(`Candidat non trouvé pour CIN: ${cin}`);
        continue;
      }

      const job = await prisma.job.findFirst({ where: { code: jobCode } });
      if (!job) {
        results.skipped++;
        results.errors.push(`Poste non trouvé pour le code: ${jobCode}`);
        continue;
      }

      const existing = await prisma.application.findFirst({
        where: { candidateId: candidate.id, jobId: job.id },
      });
      if (existing) {
        results.skipped++;
        continue;
      }

      const score = r["Score total"] ? Number(r["Score total"]) : null;
      const rank = r["Rang"] ? Number(r["Rang"]) : null;

      await prisma.application.create({
        data: {
          candidateId: candidate.id,
          jobId: job.id,
          status: status as ApplicationStatus,
          totalScore: isNaN(score as number) ? null : score,
          rank: isNaN(rank as number) ? null : rank,
          submittedAt: new Date(),
        },
      });
      results.created++;
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Failed to import applications:", error);
    return NextResponse.json({ error: "Failed to import" }, { status: 500 });
  }
}
