import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requirePermission, ROLES } from "@/lib/roles";
import { isErrorResponse } from "@/lib/roles";

const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: [
    "createContest", "manageJobs", "verifyApplications", "generateConvocation",
    "manageConvocations", "manageResults", "evaluateCandidates", "submitScores",
    "validateResults", "viewApplications", "changeApplicationStatus", "viewConvocation",
    "manageCommissions", "manageScoringCriteria", "viewRanking", "exportResults",
    "exportCandidates", "importCandidates", "exportApplications", "importApplications",
    "viewCandidates", "manageUsers", "manageExams", "scheduleExams", "manageRooms",
    "gradeExams", "viewExams",
  ],
  HR_AGENT: [
    "createContest", "manageJobs", "verifyApplications", "generateConvocation",
    "manageConvocations", "manageResults", "evaluateCandidates",
    "viewApplications", "changeApplicationStatus", "viewConvocation",
    "manageScoringCriteria", "viewRanking", "exportResults",
    "exportCandidates", "importCandidates", "exportApplications", "importApplications",
    "viewCandidates", "manageExams", "scheduleExams", "manageRooms", "viewExams",
  ],
  COMMISSION: [
    "manageResults", "evaluateCandidates", "submitScores", "validateResults",
    "viewApplications", "manageCommissions", "manageScoringCriteria", "viewRanking",
    "exportResults", "exportApplications", "scheduleExams", "gradeExams", "viewExams",
  ],
  JURY_MEMBER: [
    "evaluateCandidates", "submitScores", "validateResults",
    "viewApplications", "viewRanking", "exportResults", "exportApplications",
    "gradeExams", "viewExams",
  ],
  REVIEWER: [
    "manageResults", "evaluateCandidates", "submitScores",
    "viewApplications", "changeApplicationStatus", "viewConvocation",
    "manageScoringCriteria", "viewRanking", "exportResults",
    "exportCandidates", "exportApplications", "viewCandidates",
    "gradeExams", "viewExams", "manageConvocations",
  ],
};

const STAFF_ROLES = ["SUPER_ADMIN", "HR_AGENT", "COMMISSION", "JURY_MEMBER", "REVIEWER"];

async function getDbPermissions(): Promise<Record<string, string[]>> {
  const records = await prisma.rolePermission.findMany();
  if (records.length === 0) return DEFAULT_PERMISSIONS;
  const map: Record<string, string[]> = {};
  for (const r of records) {
    map[r.role] = r.permissions as string[];
  }
  for (const role of STAFF_ROLES) {
    if (!map[role]) map[role] = DEFAULT_PERMISSIONS[role] || [];
  }
  return map;
}

export async function GET() {
  const user = await requirePermission("manageUsers");
  if (isErrorResponse(user)) return user;

  try {
    const permissions = await getDbPermissions();
    return NextResponse.json(permissions);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch permissions" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const user = await requirePermission("manageUsers");
  if (isErrorResponse(user)) return user;

  try {
    const body = await req.json() as Record<string, string[]>;

    for (const [role, perms] of Object.entries(body)) {
      if (!STAFF_ROLES.includes(role)) continue;
      await prisma.rolePermission.upsert({
        where: { role: role as any },
        update: { permissions: perms },
        create: { role: role as any, permissions: perms },
      });
    }

    await prisma.auditLog.create({
      data: {
        adminId: user.id,
        action: "UPDATE_ROLE_PERMISSIONS",
        entity: "RolePermission",
        entityId: "all",
        details: { updated: Object.keys(body) },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update permissions" }, { status: 500 });
  }
}