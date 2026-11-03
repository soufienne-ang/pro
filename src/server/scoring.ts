import { prisma } from "./prisma";

export type CandidateProfile = "ACADEMIC" | "MANUAL";
export type EduLevel = "NONE" | "PRIMARY" | "MIDDLE" | "SECONDARY" | "VOCATIONAL";

// ---------------------------------------------------------------------------
// Scoring tables. Tune these constants to match the official decree; nothing
// else in the codebase hard-codes weights or level->points mappings.
// ---------------------------------------------------------------------------

// Order matters: used to compare a declared level against a job's minimum.
export const EDU_LEVEL_ORDER: Record<EduLevel, number> = {
  NONE: 0,
  PRIMARY: 1,
  MIDDLE: 2,
  SECONDARY: 3,
  VOCATIONAL: 4,
};

// Points awarded out of 20 for a MANUAL candidate's declared education level.
export const EDU_LEVEL_POINTS: Record<EduLevel, number> = {
  NONE: 0,
  PRIMARY: 5,
  MIDDLE: 10,
  SECONDARY: 15,
  VOCATIONAL: 20,
};

// Extra dossier points (out of 20) for a relevant professional certification.
export const CERTIFICATION_BONUS = 3;

// Weights used when a job has no explicit dossier/oral split configured.
export const DEFAULT_DOSSIER_WEIGHT = 70;
export const DEFAULT_ORAL_WEIGHT = 30;

// Scale both dossier and oral onto a common 0..20 basis before weighting.
export const ORAL_MAX_TOTAL = 20;

const ACADEMIC_CRITERIA = [
  { nameKey: "oral_speciality" as const, labelFr: "Spécialité", labelAr: "الاختصاص", maxScore: 10 },
  { nameKey: "oral_culture" as const, labelFr: "Culture générale", labelAr: "الثقافة العامة", maxScore: 5 },
  { nameKey: "oral_communication" as const, labelFr: "Communication", labelAr: "التواصل", maxScore: 5 },
] as const;

const MANUAL_CRITERIA = [
  { nameKey: "oral_practical" as const, labelFr: "Compétences pratiques", labelAr: "المهارات العملية", maxScore: 10 },
  { nameKey: "oral_professional" as const, labelFr: "Connaissances professionnelles", labelAr: "المعرفة المهنية", maxScore: 5 },
  { nameKey: "oral_communication" as const, labelFr: "Communication", labelAr: "التواصل", maxScore: 5 },
] as const;

// Both sets share these keys, so a union keeps `name` assignable to CriteriaNameKey.
export type CriteriaNameKey =
  | (typeof ACADEMIC_CRITERIA)[number]["nameKey"]
  | (typeof MANUAL_CRITERIA)[number]["nameKey"];

/**
 * Criteria that must exist for a job, given the track the job belongs to.
 * ACADEMIC jobs keep their existing criteria untouched.
 */
export function getCriteriaForProfile(profile: CandidateProfile) {
  return profile === "MANUAL" ? MANUAL_CRITERIA : ACADEMIC_CRITERIA;
}

/**
 * The criteria this job is expected to use. Falls back to ACADEMIC for
 * unknown values so an unmigrated job never loses its existing scores.
 */
export function criteriaForJob(
  job: { profile?: CandidateProfile | null },
): readonly { nameKey: CriteriaNameKey; labelFr: string; labelAr: string; maxScore: number }[] {
  return getCriteriaForProfile(job.profile === "MANUAL" ? "MANUAL" : "ACADEMIC");
}

export async function ensureScoringCriteria(jobId: string, profile: CandidateProfile = "ACADEMIC") {
  const expected = getCriteriaForProfile(profile);
  const expectedNames = new Set<string>(expected.map((c) => c.nameKey));

  const existing = await prisma.scoredCriteria.findMany({
    where: { jobId },
    select: { id: true, name: true },
  });

  const orphanIds = existing.filter((c) => !expectedNames.has(c.name)).map((c) => c.id);
  if (orphanIds.length > 0) {
    await prisma.score.deleteMany({ where: { criteriaId: { in: orphanIds } } });
    await prisma.scoredCriteria.deleteMany({ where: { id: { in: orphanIds } } });
  }

  const seen = new Set<string>();
  const dupIdsToDelete: string[] = [];
  for (const c of existing) {
    if (expectedNames.has(c.name)) {
      if (seen.has(c.name)) {
        dupIdsToDelete.push(c.id);
      } else {
        seen.add(c.name);
      }
    }
  }
  if (dupIdsToDelete.length > 0) {
    await prisma.score.deleteMany({ where: { criteriaId: { in: dupIdsToDelete } } });
    await prisma.scoredCriteria.deleteMany({ where: { id: { in: dupIdsToDelete } } });
  }

  const finalExisting = await prisma.scoredCriteria.findMany({
    where: { jobId },
    select: { name: true },
  });
  const finalNames = new Set(finalExisting.map((c) => c.name));
  for (const c of expected) {
    if (!finalNames.has(c.nameKey)) {
      await prisma.scoredCriteria.create({
        data: { jobId, name: c.nameKey, weight: c.maxScore },
      });
    }
  }
}

/** Academic-track dossier score, on the 0..20 scale. */
function computeAcademicDossier(academicInfo: unknown): number {
  if (!academicInfo || typeof academicInfo !== "object") return 0;
  const info = academicInfo as Record<string, unknown>;
  const moyenneBac = parseFloat(info.moyenneBac as string) || 0;
  const moyenne1ere = parseFloat(info.moyenne1ere as string) || 0;
  const moyenne2eme = parseFloat(info.moyenne2eme as string) || 0;
  const moyenne3eme = parseFloat(info.moyenne3eme as string) || 0;
  const secondaryAverage = (moyenne1ere + moyenne2eme + moyenne3eme) / 3;
  const outOf20 = moyenneBac * 0.5 + secondaryAverage * 0.5;
  return Math.round(outOf20 * 100) / 100;
}

/** Manual-track dossier score, on the 0..20 scale. */
function computeManualDossier(
  eduLevel: EduLevel | null | undefined,
  academicInfo: unknown,
): number {
  const base = EDU_LEVEL_POINTS[eduLevel ?? "NONE"] ?? 0;
  const hasCertification =
    academicInfo &&
    typeof academicInfo === "object" &&
    Boolean((academicInfo as Record<string, unknown>).hasCertification);
  return Math.min(ORAL_MAX_TOTAL, base + (hasCertification ? CERTIFICATION_BONUS : 0));
}

/**
 * Dossier score for an application, on the 0..20 scale.
 *
 * The academic branch preserves the legacy 0..20 `moyenne` formula so existing
 * ACADEMIC rankings are unaffected.
 */
export function computeDossierScore(args: {
  academicInfo: unknown;
  profile?: CandidateProfile | null;
  eduLevel?: EduLevel | null;
}): number {
  if (args.profile === "MANUAL") {
    return computeManualDossier(args.eduLevel, args.academicInfo);
  }
  return computeAcademicDossier(args.academicInfo);
}

/**
 * Normalise a job's configured dossier/oral weights and return the fractions
 * used to combine them. Falls back to 70/30 when unset or non-positive.
 */
export function resolveWeights(job: {
  dossierWeight?: number | null;
  oralWeight?: number | null;
}): { dossierRatio: number; oralRatio: number } {
  const dossier = job.dossierWeight && job.dossierWeight > 0 ? job.dossierWeight : DEFAULT_DOSSIER_WEIGHT;
  const oral = job.oralWeight && job.oralWeight > 0 ? job.oralWeight : DEFAULT_ORAL_WEIGHT;
  const total = dossier + oral;
  return { dossierRatio: dossier / total, oralRatio: oral / total };
}

/**
 * Whether a declared level satisfies a job's minimum requirement.
 * ACADEMIC jobs are gated on diplomas elsewhere and ignore the level.
 */
export function meetsMinEduLevel(
  job: { profile?: CandidateProfile | null; minEduLevel?: EduLevel | null },
  eduLevel: EduLevel | null | undefined,
): boolean {
  if (job.profile !== "MANUAL") return true;
  const required = EDU_LEVEL_ORDER[job.minEduLevel ?? "NONE"] ?? 0;
  return EDU_LEVEL_ORDER[eduLevel ?? "NONE"] >= required;
}

/** Combined final score, weighting the 0..20 dossier against the raw oral sum. */
export function combineTotalScore(
  dossierOn20: number,
  oralSum: number,
  job: { dossierWeight?: number | null; oralWeight?: number | null },
): number {
  const { dossierRatio, oralRatio } = resolveWeights(job);
  const total = dossierOn20 * dossierRatio + oralSum * oralRatio;
  return Math.round(total * 100) / 100;
}