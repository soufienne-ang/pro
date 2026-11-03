"use client";

import { useState, useEffect, useCallback } from "react";

interface PermissionEntry {
  key: string;
  fr: string;
  ar: string;
}

interface RoleInfo {
  value: string;
  fr: string;
  ar: string;
  cls: string;
  groups: { fr: string; ar: string; permissions: PermissionEntry[] }[];
}

const ROLE_DATA: RoleInfo[] = [
  {
    value: "SUPER_ADMIN",
    fr: "Super Administrateur",
    ar: "مدير النظام",
    cls: "bg-purple-100 text-purple-800 border-purple-200",
    groups: [
      {
        fr: "Administration",
        ar: "الإدارة",
        permissions: [
          { key: "manageUsers", fr: "Gestion des utilisateurs", ar: "إدارة المستخدمين" },
          { key: "manageCommissions", fr: "Gestion des commissions", ar: "إدارة اللجان" },
        ],
      },
      {
        fr: "Tous les accès",
        ar: "جميع الصلاحيات",
        permissions: [
          { key: "createContest", fr: "Création des concours", ar: "إنشاء المناظرات" },
          { key: "manageJobs", fr: "Gestion des postes", ar: "إدارة الخطط" },
          { key: "verifyApplications", fr: "Vérification des dossiers", ar: "التحقق من الملفات" },
          { key: "evaluateCandidates", fr: "Évaluation des candidats", ar: "تقييم المترشحين" },
          { key: "submitScores", fr: "Saisie des notes", ar: "إدخال النقاط" },
          { key: "validateResults", fr: "Validation des résultats", ar: "المصادقة على النتائج" },
          { key: "manageResults", fr: "Gestion des résultats", ar: "إدارة النتائج" },
          { key: "manageConvocations", fr: "Gestion des convocations", ar: "إدارة الاستدعاءات" },
          { key: "exportResults", fr: "Export / Reporting", ar: "التصدير والتقارير" },
          { key: "manageExams", fr: "Gestion des examens", ar: "إدارة الاختبارات" },
          { key: "scheduleExams", fr: "Planification des examens", ar: "جدولة الاختبارات" },
          { key: "manageRooms", fr: "Gestion des salles", ar: "إدارة القاعات" },
          { key: "gradeExams", fr: "Correction des examens", ar: "تصحيح الاختبارات" },
        ],
      },
    ],
  },
  {
    value: "HR_AGENT",
    fr: "Agent RH",
    ar: "عون موارد بشرية",
    cls: "bg-blue-100 text-blue-800 border-blue-200",
    groups: [
      {
        fr: "Concours & Postes",
        ar: "المناظرات والخطط",
        permissions: [
          { key: "createContest", fr: "Création des concours", ar: "إنشاء المناظرات" },
          { key: "manageJobs", fr: "Gestion des postes", ar: "إدارة الخطط" },
          { key: "manageExams", fr: "Gestion des examens", ar: "إدارة الاختبارات" },
        ],
      },
      {
        fr: "Dossiers & Candidatures",
        ar: "الملفات والترشيحات",
        permissions: [
          { key: "verifyApplications", fr: "Vérification des dossiers", ar: "التحقق من الملفات" },
          { key: "viewApplications", fr: "Consultation des candidatures", ar: "الاطلاع على الترشيحات" },
          { key: "changeApplicationStatus", fr: "Changement de statut", ar: "تغيير الحالة" },
        ],
      },
      {
        fr: "Convocations",
        ar: "الاستدعاءات",
        permissions: [
          { key: "generateConvocation", fr: "Génération des convocations", ar: "إنشاء الاستدعاءات" },
          { key: "manageConvocations", fr: "Gestion des convocations", ar: "إدارة الاستدعاءات" },
        ],
      },
      {
        fr: "Résultats",
        ar: "النتائج",
        permissions: [
          { key: "manageResults", fr: "Gestion des résultats", ar: "إدارة النتائج" },
          { key: "viewRanking", fr: "Consultation du classement", ar: "الاطلاع على الترتيب" },
        ],
      },
    ],
  },
  {
    value: "JURY_MEMBER",
    fr: "Membre du Jury",
    ar: "عضو لجنة التحكيم",
    cls: "bg-amber-100 text-amber-800 border-amber-200",
    groups: [
      {
        fr: "Évaluation",
        ar: "التقييم",
        permissions: [
          { key: "evaluateCandidates", fr: "Évaluation des candidats", ar: "تقييم المترشحين" },
          { key: "submitScores", fr: "Saisie des notes", ar: "إدخال النقاط" },
          { key: "manageScoringCriteria", fr: "Consultation des critères", ar: "الاطلاع على المعايير" },
        ],
      },
      {
        fr: "Résultats",
        ar: "النتائج",
        permissions: [
          { key: "validateResults", fr: "Validation des résultats", ar: "المصادقة على النتائج" },
          { key: "viewRanking", fr: "Consultation du classement", ar: "الاطلاع على الترتيب" },
        ],
      },
      {
        fr: "Examens",
        ar: "الاختبارات",
        permissions: [
          { key: "viewExams", fr: "Consultation des examens", ar: "الاطلاع على الاختبارات" },
          { key: "gradeExams", fr: "Correction des examens", ar: "تصحيح الاختبارات" },
        ],
      },
    ],
  },
  {
    value: "REVIEWER",
    fr: "Évaluateur (Reviewer)",
    ar: "مُقيِّم",
    cls: "bg-slate-100 text-slate-700 border-slate-200",
    groups: [
      {
        fr: "Reporting",
        ar: "التقارير",
        permissions: [
          { key: "exportResults", fr: "Export des résultats", ar: "تصدير النتائج" },
          { key: "exportApplications", fr: "Export des candidatures", ar: "تصدير الترشيحات" },
          { key: "exportCandidates", fr: "Export des candidats", ar: "تصدير المترشحين" },
        ],
      },
      {
        fr: "Statistiques",
        ar: "الإحصائيات",
        permissions: [
          { key: "viewApplications", fr: "Consultation des candidatures", ar: "الاطلاع على الترشيحات" },
          { key: "viewCandidates", fr: "Consultation des candidats", ar: "الاطلاع على المترشحين" },
          { key: "viewRanking", fr: "Consultation du classement", ar: "الاطلاع على الترتيب" },
        ],
      },
      {
        fr: "Audit",
        ar: "التدقيق",
        permissions: [
          { key: "changeApplicationStatus", fr: "Modification des statuts", ar: "تعديل الحالات" },
          { key: "manageScoringCriteria", fr: "Gestion des critères", ar: "إدارة المعايير" },
        ],
      },
      {
        fr: "Archivage",
        ar: "الأرشفة",
        permissions: [
          { key: "manageConvocations", fr: "Gestion des convocations", ar: "إدارة الاستدعاءات" },
          { key: "manageResults", fr: "Gestion des résultats", ar: "إدارة النتائج" },
        ],
      },
    ],
  },
];

const ALL_PERMISSIONS: PermissionEntry[] = [
  { key: "createContest", fr: "Création des concours", ar: "إنشاء المناظرات" },
  { key: "manageJobs", fr: "Gestion des postes", ar: "إدارة الخطط" },
  { key: "verifyApplications", fr: "Vérification des dossiers", ar: "التحقق من الملفات" },
  { key: "generateConvocation", fr: "Génération des convocations", ar: "إنشاء الاستدعاءات" },
  { key: "manageConvocations", fr: "Gestion des convocations", ar: "إدارة الاستدعاءات" },
  { key: "manageResults", fr: "Gestion des résultats", ar: "إدارة النتائج" },
  { key: "evaluateCandidates", fr: "Évaluation des candidats", ar: "تقييم المترشحين" },
  { key: "submitScores", fr: "Saisie des notes", ar: "إدخال النقاط" },
  { key: "validateResults", fr: "Validation des résultats", ar: "المصادقة على النتائج" },
  { key: "viewApplications", fr: "Consultation des candidatures", ar: "الاطلاع على الترشيحات" },
  { key: "changeApplicationStatus", fr: "Changement de statut", ar: "تغيير الحالة" },
  { key: "viewConvocation", fr: "Consultation des convocations", ar: "الاطلاع على الاستدعاءات" },
  { key: "manageCommissions", fr: "Gestion des commissions", ar: "إدارة اللجان" },
  { key: "manageScoringCriteria", fr: "Gestion des critères", ar: "إدارة المعايير" },
  { key: "viewRanking", fr: "Consultation du classement", ar: "الاطلاع على الترتيب" },
  { key: "exportResults", fr: "Export des résultats", ar: "تصدير النتائج" },
  { key: "exportCandidates", fr: "Export des candidats", ar: "تصدير المترشحين" },
  { key: "exportApplications", fr: "Export des candidatures", ar: "تصدير الترشيحات" },
  { key: "importCandidates", fr: "Import des candidats", ar: "استيراد المترشحين" },
  { key: "importApplications", fr: "Import des candidatures", ar: "استيراد الترشيحات" },
  { key: "viewCandidates", fr: "Consultation des candidats", ar: "الاطلاع على المترشحين" },
  { key: "manageUsers", fr: "Gestion des utilisateurs", ar: "إدارة المستخدمين" },
  { key: "manageExams", fr: "Gestion des examens", ar: "إدارة الاختبارات" },
  { key: "scheduleExams", fr: "Planification des examens", ar: "جدولة الاختبارات" },
  { key: "manageRooms", fr: "Gestion des salles", ar: "إدارة القاعات" },
  { key: "gradeExams", fr: "Correction des examens", ar: "تصحيح الاختبارات" },
  { key: "viewExams", fr: "Consultation des examens", ar: "الاطلاع على الاختبارات" },
];

var MATRIX_ROLES = [
  { value: "SUPER_ADMIN", fr: "Admin", ar: "مدير" },
  { value: "HR_AGENT", fr: "RH", ar: "موارد بشرية" },
  { value: "COMMISSION", fr: "Commission", ar: "لجنة" },
  { value: "JURY_MEMBER", fr: "Jury", ar: "لجنة تحكيم" },
  { value: "REVIEWER", fr: "Reviewer", ar: "مُقيِّم" },
];

function areEqual(a: Record<string, string[]>, b: Record<string, string[]>): boolean {
  var keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  for (var k of keys) {
    var pa = a[k].sort().join(",");
    var pb = (b[k] || []).sort().join(",");
    if (pa !== pb) return false;
  }
  return true;
}

export default function RolesPage() {
  var [locale, setLocale] = useState("fr");
  var [loading, setLoading] = useState(true);
  var [permissions, setPermissions] = useState<Record<string, string[]>>({});
  var [originalPermissions, setOriginalPermissions] = useState<Record<string, string[]>>({});
  var [saving, setSaving] = useState(false);
  var [success, setSuccess] = useState("");
  var [error, setError] = useState("");

  var isRTL = locale === "ar";

  useEffect(function () {
    var segments = window.location.pathname.split("/");
    setLocale(segments[1] || "fr");
  }, []);

  var fetchPermissions = useCallback(async function () {
    setLoading(true);
    setError("");
    try {
      var res = await fetch("/api/admin/roles");
      if (!res.ok) throw new Error("Failed to fetch");
      var data = await res.json();
      setPermissions(data);
      setOriginalPermissions(JSON.parse(JSON.stringify(data)));
    } catch {
      setError(isRTL ? "خطأ في تحميل الصلاحيات" : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [isRTL]);

  useEffect(function () {
    if (locale) fetchPermissions();
  }, [locale, fetchPermissions]);

  var hasChanges = !areEqual(permissions, originalPermissions);

  function togglePermission(roleKey: string, permKey: string) {
    setPermissions(function (prev) {
      var rolePerms = prev[roleKey] || [];
      var idx = rolePerms.indexOf(permKey);
      if (idx >= 0) {
        return { ...prev, [roleKey]: rolePerms.filter(function (p) { return p !== permKey; }) };
      } else {
        return { ...prev, [roleKey]: [...rolePerms, permKey] };
      }
    });
  }

  async function handleSave() {
    setSaving(true);
    setSuccess("");
    setError("");
    try {
      var res = await fetch("/api/admin/roles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(permissions),
      });
      if (!res.ok) throw new Error("Save failed");
      setOriginalPermissions(JSON.parse(JSON.stringify(permissions)));
      setSuccess(isRTL ? "تم حفظ الصلاحيات بنجاح" : "Permissions enregistrées avec succès");
      setTimeout(function () { setSuccess(""); }, 3000);
    } catch {
      setError(isRTL ? "خطأ في حفظ الصلاحيات" : "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  function getRolePerms(roleKey: string): string[] {
    return permissions[roleKey] || [];
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">{isRTL ? "جار التحميل..." : "Chargement..."}</div>
      </div>
    );
  }

  return (
    <div dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{isRTL ? "الصلاحيات والأدوار" : "Permissions & Rôles"}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isRTL
              ? "إدارة صلاحيات الأدوار في منصة PROMOSPORT"
              : "Gérer les permissions de chaque rôle dans la plateforme PROMOSPORT"}
          </p>
        </div>
        {hasChanges && (
          <div className="flex items-center gap-3">
            {success && <span className="text-sm text-green-600 font-medium">{success}</span>}
            {error && <span className="text-sm text-red-600 font-medium">{error}</span>}
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {isRTL ? "جاري الحفظ..." : "Enregistrement..."}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {isRTL ? "حفظ التغييرات" : "Enregistrer les modifications"}
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {success && !hasChanges && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
          {success}
        </div>
      )}

      {/* Role Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {ROLE_DATA.map(function (role) {
          var rolePerms = getRolePerms(role.value);
          return (
            <div key={role.value} className={"rounded-xl border-2 p-4 " + role.cls}>
              <div className="font-bold text-base mb-3">
                {isRTL ? role.ar : role.fr}
                <span className="ml-2 text-xs font-normal opacity-60">({rolePerms.length} permissions)</span>
              </div>
              <div className="space-y-3">
                {role.groups.map(function (group, gi) {
                  var groupPerms = group.permissions.filter(function (p) { return rolePerms.includes(p.key); });
                  if (groupPerms.length === 0) return null;
                  return (
                    <div key={gi}>
                      <div className="text-xs font-semibold uppercase tracking-wide opacity-70 mb-1">
                        {isRTL ? group.ar : group.fr}
                      </div>
                      <ul className="space-y-0.5">
                        {groupPerms.map(function (perm) {
                          return (
                            <li key={perm.key} className="text-xs flex items-start gap-1.5">
                              <span className="mt-0.5 shrink-0">•</span>
                              <span>{isRTL ? perm.ar : perm.fr}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
                {rolePerms.length === 0 && (
                  <p className="text-xs italic opacity-50">
                    {isRTL ? "لا توجد صلاحيات" : "Aucune permission"}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Editable Permission Matrix */}
      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between">
          <h2 className="text-base font-semibold">
            {isRTL ? "مصفوفة الصلاحيات (قابل للتعديل)" : "Matrice des permissions (modifiable)"}
          </h2>
          {hasChanges && (
            <span className="text-xs text-amber-600 font-medium">
              {isRTL ? "تغييرات غير محفوظة" : "Modifications non enregistrées"}
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="text-right p-3 font-medium min-w-[200px]">
                  {isRTL ? "الصلاحية" : "Permission"}
                </th>
                {MATRIX_ROLES.map(function (r) {
                  return (
                    <th key={r.value} className="text-center p-3 font-medium text-xs min-w-[90px]">
                      {isRTL ? r.ar : r.fr}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {ALL_PERMISSIONS.map(function (perm, idx) {
                return (
                  <tr key={perm.key} className={"border-b hover:bg-slate-50 " + (idx % 2 === 0 ? "bg-white" : "bg-slate-50/50")}>
                    <td className="p-3 text-xs font-medium">
                      {isRTL ? perm.ar : perm.fr}
                    </td>
                    {MATRIX_ROLES.map(function (r) {
                      var rolePerms = getRolePerms(r.value);
                      var has = rolePerms.includes(perm.key);
                      var origRolePerms = originalPermissions[r.value] || [];
                      var was = origRolePerms.includes(perm.key);
                      var changed = has !== was;
                      return (
                        <td key={r.value} className="p-3 text-center">
                          <button
                            onClick={function () { togglePermission(r.value, perm.key); }}
                            className={"inline-flex items-center justify-center w-7 h-7 rounded-full transition-all cursor-pointer " + (
                              has
                                ? "bg-green-100 text-green-700 hover:bg-green-200 hover:scale-110"
                                : "bg-slate-100 text-slate-300 hover:bg-slate-200 hover:scale-110"
                            ) + (changed ? " ring-2 ring-offset-1 ring-amber-400" : "")}
                            title={(has ? (isRTL ? "إزالة" : "Retirer") : (isRTL ? "إضافة" : "Ajouter")) + " " + (isRTL ? perm.ar : perm.fr)}
                          >
                            {has ? (
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                              </svg>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}