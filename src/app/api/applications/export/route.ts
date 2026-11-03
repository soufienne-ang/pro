export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import * as XLSX from "xlsx";
import { requirePermission, isErrorResponse } from "@/lib/roles";

export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission("exportApplications");
    if (isErrorResponse(user)) return user;

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "xlsx";
    const search = searchParams.get("search") || "";
    const jobId = searchParams.get("jobId") || "";
    const status = searchParams.get("status") || "";

    const where: Record<string, unknown> = {};
    if (jobId) where.jobId = jobId;
    if (status) where.status = status;

    if (search) {
      where.candidate = {
        OR: [
          { fullName: { contains: search } },
          { cin: { contains: search } },
        ],
      };
    }

    const applications = await prisma.application.findMany({
      where,
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
        job: {
          select: { code: true, titleFr: true, titleAr: true },
        },
        documents: {
          select: { fileName: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const rows = applications.map((app) => ({
      "Nom complet": app.candidate.fullName,
      Email: app.candidate.email,
      CIN: app.candidate.cin,
      Téléphone: app.candidate.phone,
      Gouvernorat: app.candidate.governorate,
      Délégation: app.candidate.delegation,
      "Date de naissance": app.candidate.dateOfBirth ? new Date(app.candidate.dateOfBirth).toLocaleDateString("fr-FR") : "",
      Genre: app.candidate.gender === "MALE" ? "Homme" : "Femme",
      Concours: app.job.code,
      "Titre concours": app.job.titleFr,
      Statut: app.status,
      "Date soumission": app.submittedAt ? new Date(app.submittedAt).toLocaleDateString("fr-FR") : "",
      Documents: app.documents.map(d => d.fileName).join("; "),
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = Object.keys(rows[0] || {}).map((k) => ({ wch: Math.max(k.length, 20) }));
    XLSX.utils.book_append_sheet(wb, ws, "Candidatures");

    if (format === "csv") {
      const csv = XLSX.utils.sheet_to_csv(ws);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="candidatures_${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="candidatures_${new Date().toISOString().split("T")[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Failed to export applications:", error);
    return new Response("Failed to export", { status: 500 });
  }
}
