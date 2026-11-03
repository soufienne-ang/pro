export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import * as XLSX from "xlsx";
import { requirePermission, isErrorResponse } from "@/lib/roles";

export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission("exportCandidates");
    if (isErrorResponse(user)) return user;

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "xlsx";
    const search = searchParams.get("search") || "";
    const jobId = searchParams.get("jobId") || "";

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { email: { contains: search } },
        { cin: { contains: search } },
      ];
    }
    if (jobId) {
      where.applications = { some: { jobId } };
    }

    const candidates = await prisma.candidate.findMany({
      where,
      select: {
        fullName: true,
        email: true,
        cin: true,
        phone: true,
        governorate: true,
        delegation: true,
        dateOfBirth: true,
        gender: true,
        isEmailVerified: true,
        hasExperience: true,
        createdAt: true,
        _count: { select: { applications: true } },
        applications: {
          where: jobId ? { jobId } : undefined,
          select: { job: { select: { code: true, titleAr: true, titleFr: true } } },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const rows = candidates.map((c) => ({
      "Nom complet": c.fullName,
      Email: c.email,
      CIN: c.cin,
      Téléphone: c.phone,
      Gouvernorat: c.governorate,
      Délégation: c.delegation,
      "Date de naissance": c.dateOfBirth ? new Date(c.dateOfBirth).toLocaleDateString("fr-FR") : "",
      Genre: c.gender === "MALE" ? "Homme" : "Femme",
      "Email vérifié": c.isEmailVerified ? "Oui" : "Non",
      "Expérience": c.hasExperience ? "Oui" : "Non",
      Concours: c.applications?.[0]?.job?.code || "",
      "Titre concours": c.applications?.[0]?.job ? (c.applications[0].job.titleFr) : "",
      "Inscrit le": new Date(c.createdAt).toLocaleDateString("fr-FR"),
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = Object.keys(rows[0] || {}).map((k) => ({ wch: Math.max(k.length, 18) }));
    XLSX.utils.book_append_sheet(wb, ws, "Candidats");

    if (format === "csv") {
      const csv = XLSX.utils.sheet_to_csv(ws);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="candidats_${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="candidats_${new Date().toISOString().split("T")[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Failed to export candidates:", error);
    return new Response("Failed to export", { status: 500 });
  }
}
