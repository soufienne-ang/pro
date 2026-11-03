export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import * as XLSX from "xlsx";
import { requirePermission, isErrorResponse } from "@/lib/roles";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission("importCandidates");
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

    const results = { created: 0, skipped: 0, errors: [] as string[] };
    const defaultPassword = await bcrypt.hash("promosport2024", 10);

    for (const row of rows) {
      const r = row as Record<string, unknown>;
      const email = String(r["Email"] || r["email"] || "").trim();
      const cin = String(r["CIN"] || r["cin"] || "").trim();
      const fullName = String(r["Nom complet"] || r["fullName"] || r["Nom"] || "").trim();
      const phone = String(r["Téléphone"] || r["phone"] || r["Tel"] || "").trim();
      const governorate = String(r["Gouvernorat"] || r["governorate"] || "").trim();
      const delegation = String(r["Délégation"] || r["delegation"] || "").trim();
      const genderRaw = String(r["Genre"] || r["gender"] || "").trim().toUpperCase();
      const gender = genderRaw === "HOMME" || genderRaw === "MALE" || genderRaw === "M" ? "MALE" : "FEMALE";
      const dobRaw = r["Date de naissance"] || r["dateOfBirth"] || "";

      if (!email || !cin || !fullName) {
        results.skipped++;
        results.errors.push(`Ligne ignorée: email, CIN ou nom manquant`);
        continue;
      }

      const existing = await prisma.candidate.findFirst({
        where: { OR: [{ email }, { cin }] },
      });
      if (existing) {
        results.skipped++;
        continue;
      }

      let dateOfBirth = new Date("2000-01-01");
      if (dobRaw) {
        const parsed = new Date(String(dobRaw));
        if (!isNaN(parsed.getTime())) dateOfBirth = parsed;
      }

      await prisma.candidate.create({
        data: {
          email,
          password: defaultPassword,
          fullName,
          cin,
          phone: phone || "00000000",
          governorate: governorate || "Tunis",
          delegation: delegation || "Tunis",
          gender: gender as "MALE" | "FEMALE",
          dateOfBirth,
          isEmailVerified: true,
        },
      });
      results.created++;
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Failed to import candidates:", error);
    return NextResponse.json({ error: "Failed to import" }, { status: 500 });
  }
}
