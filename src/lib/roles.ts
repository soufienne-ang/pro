import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";

export const ROLES = {
  ADMIN: "SUPER_ADMIN",
  HR_AGENT: "HR_AGENT",
  COMMISSION: "COMMISSION",
  JURY: "JURY_MEMBER",
  REVIEWER: "REVIEWER",
  CANDIDATE: "CANDIDATE",
} as const;

export type AppRole = (typeof ROLES)[keyof typeof ROLES];

export const STAFF_ROLES: AppRole[] = [ROLES.ADMIN, ROLES.HR_AGENT, ROLES.COMMISSION, ROLES.JURY, ROLES.REVIEWER];

const PERMISSIONS = {
  // === HR_AGENT core scope ===
  createContest: [ROLES.ADMIN, ROLES.HR_AGENT],
  manageJobs: [ROLES.ADMIN, ROLES.HR_AGENT],
  verifyApplications: [ROLES.ADMIN, ROLES.HR_AGENT],
  generateConvocation: [ROLES.ADMIN, ROLES.HR_AGENT],
  manageConvocations: [ROLES.ADMIN, ROLES.HR_AGENT],
  manageResults: [ROLES.ADMIN, ROLES.HR_AGENT, ROLES.COMMISSION, ROLES.REVIEWER],

  // === JURY_MEMBER core scope ===
  evaluateCandidates: [ROLES.ADMIN, ROLES.HR_AGENT, ROLES.COMMISSION, ROLES.JURY, ROLES.REVIEWER],
  submitScores: [ROLES.ADMIN, ROLES.COMMISSION, ROLES.JURY, ROLES.REVIEWER],
  validateResults: [ROLES.ADMIN, ROLES.COMMISSION, ROLES.JURY],

  // === Admin-only ===
  manageUsers: [ROLES.ADMIN],

  // === Cross-role read/access ===
  viewApplications: [ROLES.ADMIN, ROLES.HR_AGENT, ROLES.COMMISSION, ROLES.JURY, ROLES.REVIEWER],
  changeApplicationStatus: [ROLES.ADMIN, ROLES.HR_AGENT, ROLES.REVIEWER],
  viewConvocation: [ROLES.ADMIN, ROLES.HR_AGENT, ROLES.CANDIDATE, ROLES.REVIEWER],
  manageCommissions: [ROLES.ADMIN, ROLES.COMMISSION],
  manageScoringCriteria: [ROLES.ADMIN, ROLES.HR_AGENT, ROLES.COMMISSION, ROLES.REVIEWER],
  viewRanking: [ROLES.ADMIN, ROLES.HR_AGENT, ROLES.COMMISSION, ROLES.JURY, ROLES.REVIEWER],
  exportResults: [ROLES.ADMIN, ROLES.HR_AGENT, ROLES.COMMISSION, ROLES.REVIEWER, ROLES.JURY],
  exportCandidates: [ROLES.ADMIN, ROLES.HR_AGENT, ROLES.REVIEWER],
  importCandidates: [ROLES.ADMIN, ROLES.HR_AGENT],
  exportApplications: [ROLES.ADMIN, ROLES.HR_AGENT, ROLES.COMMISSION, ROLES.REVIEWER, ROLES.JURY],
  importApplications: [ROLES.ADMIN, ROLES.HR_AGENT],
  viewCandidates: [ROLES.ADMIN, ROLES.HR_AGENT, ROLES.REVIEWER],
  // === Exam / Epreuve module ===
  manageExams: [ROLES.ADMIN, ROLES.HR_AGENT],
  scheduleExams: [ROLES.ADMIN, ROLES.HR_AGENT, ROLES.COMMISSION],
  manageRooms: [ROLES.ADMIN, ROLES.HR_AGENT],
  gradeExams: [ROLES.ADMIN, ROLES.COMMISSION, ROLES.JURY, ROLES.REVIEWER],
  viewExams: [ROLES.ADMIN, ROLES.HR_AGENT, ROLES.COMMISSION, ROLES.JURY, ROLES.REVIEWER],
} as const satisfies Record<string, readonly AppRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(role: string | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly string[]).includes(role);
}

export function isStaff(role: string | undefined | null): boolean {
  return STAFF_ROLES.includes(role as AppRole);
}

export function isAdmin(role: string | undefined | null): boolean {
  return role === ROLES.ADMIN;
}

export function isCandidate(role: string | undefined | null): boolean {
  return role === ROLES.CANDIDATE;
}

export function getRoleLabel(role: string | undefined | null, locale: "ar" | "fr" = "fr"): string {
  const labels: Record<string, { fr: string; ar: string }> = {
    [ROLES.ADMIN]: { fr: "Administrateur", ar: "مدير النظام" },
    [ROLES.HR_AGENT]: { fr: "Agent RH", ar: "عون موارد بشرية" },
    [ROLES.COMMISSION]: { fr: "Commission", ar: "اللجنة" },
    [ROLES.JURY]: { fr: "Membre du Jury", ar: "عضو لجنة التحكيم" },
    [ROLES.REVIEWER]: { fr: "Évaluateur", ar: "مُقيِّم" },
    [ROLES.CANDIDATE]: { fr: "Candidat", ar: "مترشّح" },
  };
  return labels[role || ""]?.[locale] || role || "—";
}

export interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  role: string;
  isEmailVerified?: boolean;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return session.user as SessionUser;
}

export async function requireUser(): Promise<SessionUser | NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return user;
}

export async function requirePermission(
  permission: Permission
): Promise<SessionUser | NextResponse> {
  const result = await requireUser();
  if (result instanceof NextResponse) return result;
  if (!hasPermission(result.role, permission)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return result;
}

export async function requireRole(
  roles: AppRole | AppRole[]
): Promise<SessionUser | NextResponse> {
  const result = await requireUser();
  if (result instanceof NextResponse) return result;
  const allowed = Array.isArray(roles) ? roles : [roles];
  if (!allowed.includes(result.role as AppRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return result;
}

export function isErrorResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}
