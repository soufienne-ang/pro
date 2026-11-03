"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";

interface Criterion {
  id: string;
  name: string;
  weight: number;
}

interface CandidateInfo {
  id: string;
  fullName: string;
  email: string;
  cin: string;
  governorate: string;
  phone: string;
}

interface JobSummary {
  id: string;
  code: string;
  titleFr: string;
  titleAr: string;
}

interface RankedCandidate {
  applicationId: string;
  candidate: CandidateInfo;
  status: string;
  scores: Array<{ criteriaId: string; criteriaName: string; weight: number; value: number }>;
  weightedScore: number;
  applicationScore: number;
  oralTotal: number;
  rank: number;
}

type TabKey = "scoring" | "ranking" | "validation";

export default function JobScoringPage() {
  const params = useParams();
  const jobId = params?.jobId as string;
  const { data: session } = useSession();
  const userRole = session?.user?.role;

  const [locale, setLocale] = useState("fr");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("scoring");

  const [job, setJob] = useState<{ code: string; titleFr: string; titleAr: string } | null>(null);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [rankedCandidates, setRankedCandidates] = useState<RankedCandidate[]>([]);

  const [localScores, setLocalScores] = useState<Record<string, Record<string, string>>>({});
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [selectedForFinal, setSelectedForFinal] = useState<Set<string>>(new Set());

  const [scoreDossierModal, setScoreDossierModal] = useState<{ applicationId: string; candidateName: string } | null>(null);
  const [scoreDossierData, setScoreDossierData] = useState<{ academicInfo: { moyenneBac: string; moyenne1ere: string; moyenne2eme: string; moyenne3eme: string }; applicationScore: number } | null>(null);
  const [scoreDossierLoading, setScoreDossierLoading] = useState(false);
  const [scoreDossierSaving, setScoreDossierSaving] = useState(false);
  const [scoreDossierEdit, setScoreDossierEdit] = useState<{ moyenneBac: string; moyenne1ere: string; moyenne2eme: string; moyenne3eme: string }>({ moyenneBac: "", moyenne1ere: "", moyenne2eme: "", moyenne3eme: "" });

  const canValidate = userRole === "SUPER_ADMIN" || userRole === "COMMISSION" || userRole === "JURY_MEMBER";

  useEffect(() => {
    const segments = window.location.pathname.split("/");
    setLocale(segments[1] || "fr");
  }, []);

  const fetchData = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    try {
      const [jobsRes, criteriaRes, rankingRes] = await Promise.all([
        fetch("/api/jobs?status=ALL"),
        fetch(`/api/scoring/criteria?jobId=${jobId}`),
        fetch(`/api/scoring/ranking?jobId=${jobId}`),
      ]);

      if (jobsRes.ok) {
        const allJobs = await jobsRes.json();
        const found = allJobs.find((j: JobSummary) => j.id === jobId);
        setJob(found || null);
      }

      if (criteriaRes.ok) {
        const data = await criteriaRes.json();
        setCriteria(data);
      }

      if (rankingRes.ok) {
        const data = await rankingRes.json();
        setRankedCandidates(data.rankedCandidates || []);

        const scores: Record<string, Record<string, string>> = {};
        for (const rc of data.rankedCandidates || []) {
          scores[rc.applicationId] = {};
          for (const s of rc.scores) {
            scores[rc.applicationId][s.criteriaId] = String(s.value || "");
          }
        }
        setLocalScores(scores);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleScoreChange = (applicationId: string, criteriaId: string, value: string) => {
    setLocalScores((prev) => ({
      ...prev,
      [applicationId]: { ...(prev[applicationId] || {}), [criteriaId]: value },
    }));
  };

  const saveScores = async (applicationId: string) => {
    setSaving(true);
    try {
      const scores = criteria.map((c) => ({
        criteriaId: c.id,
        value: parseFloat(localScores[applicationId]?.[c.id]) || 0,
      }));

      const res = await fetch("/api/scoring/scores", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, scores }),
      });

      if (res.ok) {
        await fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const saveAllScores = async () => {
    setSaving(true);
    try {
      for (const rc of rankedCandidates) {
        const scores = criteria.map((c) => ({
          criteriaId: c.id,
          value: parseFloat(localScores[rc.applicationId]?.[c.id]) || 0,
        }));
        await fetch("/api/scoring/scores", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ applicationId: rc.applicationId, scores }),
        });
      }
      await fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (applicationId: string, status: string) => {
    try {
      await fetch(`/api/applications/${applicationId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const exportExcel = () => {
    const params = new URLSearchParams({ jobId });
    if (filterStatus !== "ALL") params.set("status", filterStatus);
    window.open(`/api/scoring/export?${params}`, "_blank");
  };

  const exportPdf = () => {
    const params = new URLSearchParams({ jobId });
    if (filterStatus !== "ALL") params.set("status", filterStatus);
    window.open(`/api/scoring/export-pdf?${params}`, "_blank");
  };

  const validateResults = async (applicationIds?: string[], finalList = true) => {
    if (!confirm(isRTL ? "تأكيد عملية التحقق من النتائج؟" : "Confirmer la validation des résultats ?")) return;
    setValidating(true);
    try {
      const res = await fetch("/api/scoring/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, applicationIds, finalList }),
      });
      if (res.ok) {
        const d = await res.json();
        alert(isRTL ? `تم التحقق من ${d.count} طلب` : `${d.count} candidature(s) validée(s)`);
        await fetchData();
      } else {
        const d = await res.json().catch(() => ({}));
        alert(d.error || (isRTL ? "خطأ" : "Erreur"));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setValidating(false);
    }
  };

  const toggleFinalSelection = (id: string) => {
    setSelectedForFinal((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const isRTL = locale === "ar";

  const CRITERIA_LABELS: Record<string, { fr: string; ar: string; max: number }> = {
    oral_specialty: { fr: "Spécialité", ar: "العدد المسند للسؤال في الاختصاص ", max: 10 },
    oral_culture: { fr: "Culture générale", ar: "العدد المسند للثقافة العامة ", max: 5 },
    oral_communication: { fr: "Communication", ar: "العدد المسند للقدرة على التواصل ", max: 5 },
  };

  const displayCandidates = rankedCandidates.filter((rc) => {
    if (filterStatus === "ALL") return true;
    return rc.status === filterStatus;
  });

  if (loading && !job) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            {isRTL ? `تقييم: ${job?.titleAr || ""}` : `Scoring: ${job?.titleFr || ""}`}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isRTL ? `الرمز: ${job?.code}` : `Code: ${job?.code}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportExcel}
            className="px-3 py-1.5 border rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
            {isRTL ? "تصدير Excel" : "Export Excel"}
          </button>
          <button onClick={exportPdf}
            className="px-3 py-1.5 border rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
            {isRTL ? "تصدير PDF" : "Export PDF"}
          </button>
        </div>
      </div>

      <div className="flex gap-1 mb-6 bg-slate-100 rounded-lg p-1 w-fit flex-wrap">
        <button onClick={() => setActiveTab("scoring")}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            activeTab === "scoring"
              ? "bg-white text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}>
          {isRTL ? "تقييم المترشحين" : "Notation"}
        </button>
        <button onClick={() => setActiveTab("ranking")}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            activeTab === "ranking"
              ? "bg-white text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}>
          {isRTL ? "الترتيب" : "Classement"}
        </button>
        {canValidate && (
          <button onClick={() => setActiveTab("validation")}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeTab === "validation"
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}>
            {isRTL ? "التحقق من النتائج" : "Validation"}
          </button>
        )}
      </div>

      {activeTab === "scoring" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2">
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                <option value="ALL">{isRTL ? "جميع الحالات" : "Tous les statuts"}</option>
                <option value="PENDING">{isRTL ? "قيد الانتظار" : "En attente"}</option>
                <option value="UNDER_REVIEW">{isRTL ? "قيد المراجعة" : "En cours"}</option>
                <option value="APPROVED">{isRTL ? "مقبول" : "Approuvé"}</option>
                <option value="REJECTED">{isRTL ? "مرفوض" : "Rejeté"}</option>
                <option value="ORAL_TEST">{isRTL ? "اختبار شفوي" : "Oral"}</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={saveAllScores} disabled={saving}
                className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                {saving ? (isRTL ? "جاري الحفظ..." : "Sauvegarde...") : (isRTL ? "حفظ الكل" : "Tout sauvegarder")}
              </button>
            </div>
          </div>

          {displayCandidates.length === 0 ? (
            <div className="bg-white rounded-xl border p-12 text-center shadow-sm">
              <p className="text-muted-foreground">
                {isRTL ? "لا يوجد مترشحون" : "Aucun candidat"}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="text-right p-3 font-medium whitespace-nowrap">{isRTL ? "المترشح" : "Candidat"}</th>
                    <th className="text-right p-3 font-medium hidden md:table-cell">{isRTL ? "رقم بطاقة التعريف" : "CIN"}</th>
                    {criteria.map((c) => {
                      const label = CRITERIA_LABELS[c.name] || { fr: c.name, ar: c.name, max: 20 };
                      return (
                        <th key={c.id} className="text-center p-3 font-medium min-w-[90px]">
                          <div className="text-xs">{isRTL ? label.ar : label.fr}</div>
                          <div className="text-[10px] text-muted-foreground">/{label.max}</div>
                        </th>
                      );
                    })}
                    <th className="text-center p-3 font-medium whitespace-nowrap">
                      {isRTL ? "مجموع نقاط الملف" : "Dossier"}
                    </th>
                    <th className="text-center p-3 font-medium whitespace-nowrap">
                      {isRTL ? "المجموع" : "Total"}
                    </th>
                    <th className="text-center p-3 font-medium">{isRTL ? "الحالة" : "Statut"}</th>
                    <th className="text-center p-3 font-medium">{isRTL ? "إجراءات" : "Actions"}</th>
                  </tr>
                </thead>
                <tbody>
                  {displayCandidates.map((rc) => {
                    return (
                      <tr key={rc.applicationId} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                        <td className="p-3">
                          <div className="font-medium">{rc.candidate.fullName}</div>
                          <div className="text-xs text-muted-foreground">{rc.candidate.email}</div>
                        </td>
                        <td className="p-3 text-xs font-mono hidden md:table-cell">{rc.candidate.cin}</td>
                        {criteria.map((c) => {
                          const label = CRITERIA_LABELS[c.name] || { fr: c.name, ar: c.name, max: 20 };
                          return (
                            <td key={c.id} className="p-1 text-center">
                              <input type="number" min="0" max={label.max} step="0.5"
                                value={localScores[rc.applicationId]?.[c.id] || ""}
                                onChange={(e) => handleScoreChange(rc.applicationId, c.id, e.target.value)}
                                className="w-16 h-8 rounded border border-input bg-background px-1 text-sm text-center" />
                            </td>
                          );
                        })}
                        <td className="p-3 text-center font-semibold text-blue-600">
                          {rc.applicationScore || 0}
                        </td>
                        <td className="p-3 text-center font-semibold">
                          {rc.weightedScore}
                        </td>
                        <td className="p-3 text-center">
                          <select value={rc.status} onChange={(e) => updateStatus(rc.applicationId, e.target.value)}
                            className="text-xs font-medium rounded-full px-2 py-1 border-0 cursor-pointer bg-slate-50">
                            <option value="PENDING">{isRTL ? "قيد الانتظار" : "En attente"}</option>
                            <option value="UNDER_REVIEW">{isRTL ? "قيد المراجعة" : "En cours"}</option>
                            <option value="APPROVED">{isRTL ? "مقبول" : "Approuvé"}</option>
                            <option value="REJECTED">{isRTL ? "مرفوض" : "Rejeté"}</option>
                            <option value="ORAL_TEST">{isRTL ? "اختبار شفوي" : "Oral"}</option>
                            <option value="FINAL_LIST">{isRTL ? "قائمة نهائية" : "Finale"}</option>
                          </select>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => {
                              setScoreDossierModal({ applicationId: rc.applicationId, candidateName: rc.candidate.fullName });
                              setScoreDossierLoading(true);
                              setScoreDossierData(null);
                              fetch(`/api/applications/${rc.applicationId}`)
                                .then(r => r.ok ? r.json() : null)
                                .then(d => {
                                  const app = d?.application;
                                  if (app?.academicInfo) {
                                    setScoreDossierData(app);
                                    setScoreDossierEdit({ ...app.academicInfo as { moyenneBac: string; moyenne1ere: string; moyenne2eme: string; moyenne3eme: string } });
                                  }
                                })
                                .catch(() => {})
                                .finally(() => setScoreDossierLoading(false));
                            }}
                              className="px-2 py-1 border rounded text-xs hover:bg-slate-100">
                              {isRTL ? "نقاط الملف" : "Dossier"}
                            </button>
                            <button onClick={() => saveScores(rc.applicationId)}
                              className="px-2 py-1 border rounded text-xs hover:bg-slate-100">
                              {isRTL ? "حفظ" : "Sauver"}
                            </button>
                            <button onClick={async () => {
                              if (!window.confirm(isRTL ? "هل أنت متأكد من حذف نتائج هذا المترشح؟" : "Confirmer la suppression des notes de ce candidat ?")) return;
                              const res = await fetch(`/api/scoring/scores?applicationId=${rc.applicationId}`, { method: "DELETE" });
                              if (res.ok) fetchData(); else alert(isRTL ? "فشل الحذف" : "Échec de la suppression");
                            }} className="px-2 py-1 border border-red-200 text-red-600 rounded text-xs hover:bg-red-50">
                              {isRTL ? "حذف" : "Suppr."}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "ranking" && (
        <div>
          <div className="text-xs text-muted-foreground mb-4 p-3 bg-slate-50 rounded-lg">
            {isRTL
              ? "الترتيب النهائي للمترشحين تفاضليا: ترتيب المترشحين تفاضليا حسب المجموع العام للنقاط المتحصل عليها : المجموع العام للنقاط = (عدد النقاط المسندة للملف) × 0.7 + (عدد النقاط المسندة في الإختبار الشفاهي) × 0.3"
              : "Classement final des candidats de manière différentielle : Classement des candidats de manière différentielle selon le score total obtenu : Score total = (Score dossier) × 0.7 + (Score oral) × 0.3"}
          </div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2">
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                <option value="ALL">{isRTL ? "جميع الحالات" : "Tous les statuts"}</option>
                <option value="PENDING">{isRTL ? "قيد الانتظار" : "En attente"}</option>
                <option value="APPROVED">{isRTL ? "مقبول" : "Approuvé"}</option>
                <option value="ORAL_TEST">{isRTL ? "اختبار شفوي" : "Oral"}</option>
                <option value="FINAL_LIST">{isRTL ? "قائمة نهائية" : "Finale"}</option>
              </select>
            </div>
          </div>

          {displayCandidates.length === 0 ? (
            <div className="bg-white rounded-xl border p-12 text-center shadow-sm">
              <p className="text-muted-foreground">
                {isRTL ? "لا توجد نتائج" : "Aucun résultat"}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="text-center p-3 font-medium w-12">#</th>
                    <th className="text-right p-3 font-medium">{isRTL ? "المترشح" : "Candidat"}</th>
                    <th className="text-right p-3 font-medium hidden md:table-cell">{isRTL ? "رقم بطاقة التعريف" : "CIN"}</th>
                    <th className="text-right p-3 font-medium hidden lg:table-cell">{isRTL ? "الولاية" : "Gouv."}</th>
                    {criteria.map((c) => {
                      const label = CRITERIA_LABELS[c.name] || { fr: c.name, ar: c.name, max: 20 };
                      return (
                        <th key={c.id} className="text-center p-3 font-medium text-xs whitespace-nowrap">
                          <div>{isRTL ? label.ar : label.fr}</div>
                          <div className="text-muted-foreground">/{label.max}</div>
                        </th>
                      );
                    })}
                    <th className="text-center p-3 font-medium text-xs whitespace-nowrap">{isRTL ? "نقاط الملف" : "Dossier"}</th>
                    <th className="text-center p-3 font-medium">{isRTL ? "النتيجة" : "Total"}</th>
                    <th className="text-center p-3 font-medium">{isRTL ? "الحالة" : "Statut"}</th>
                  </tr>
                </thead>
                <tbody>
                  {displayCandidates.map((rc, idx) => {
                    const rankColor =
                      idx === 0 ? "bg-amber-100 text-amber-800" :
                      idx <= Math.min(2, displayCandidates.length - 1) ? "bg-slate-100 text-slate-700" :
                      "text-muted-foreground";
                    return (
                      <tr key={rc.applicationId} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                        <td className={`p-3 text-center font-bold ${rankColor}`}>
                          #{rc.rank || idx + 1}
                        </td>
                        <td className="p-3">
                          <div className="font-medium">{rc.candidate.fullName}</div>
                          <div className="text-xs text-muted-foreground">{rc.candidate.email}</div>
                        </td>
                        <td className="p-3 text-xs font-mono hidden md:table-cell">{rc.candidate.cin}</td>
                        <td className="p-3 text-xs text-muted-foreground hidden lg:table-cell">{rc.candidate.governorate}</td>
                        {criteria.map((c) => (
                          <td key={c.id} className="p-3 text-center text-sm font-mono">
                            {rc.scores.find((s) => s.criteriaId === c.id)?.value || 0}
                          </td>
                        ))}
                        <td className="p-3 text-center font-bold text-blue-600">
                          {rc.applicationScore || 0}
                        </td>
                        <td className="p-3 text-center font-bold text-primary">
                          {rc.weightedScore}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${
                            rc.status === "APPROVED" ? "bg-green-50 text-green-700" :
                            rc.status === "REJECTED" ? "bg-red-50 text-red-700" :
                            rc.status === "ORAL_TEST" ? "bg-purple-50 text-purple-700" :
                            rc.status === "FINAL_LIST" ? "bg-teal-50 text-teal-700" :
                            "bg-amber-50 text-amber-700"
                          }`}>
                            {rc.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "validation" && canValidate && (
        <div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
            <h2 className="text-base font-semibold text-amber-900 mb-1">
              {isRTL ? "التحقق من النتائج" : "Validation des résultats"}
            </h2>
            <p className="text-sm text-amber-800">
              {isRTL
                ? "حدد المترشحين الذين يجب أن يكونوا في القائمة النهائية، أو اضغط على الزر لتأكيد جميع المترشحين المقبولين."
                : "Sélectionnez les candidats à inclure dans la liste finale, ou cliquez sur le bouton pour valider tous les candidats approuvés."}
            </p>
          </div>

          <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">
                {isRTL ? `المحدد: ${selectedForFinal.size}` : `${selectedForFinal.size} sélectionné(s)`}
              </label>
              <button onClick={() => setSelectedForFinal(new Set(rankedCandidates.map((r) => r.applicationId)))}
                className="px-2 py-1 text-xs border rounded hover:bg-slate-50">
                {isRTL ? "تحديد الكل" : "Tout sélectionner"}
              </button>
              <button onClick={() => setSelectedForFinal(new Set())}
                className="px-2 py-1 text-xs border rounded hover:bg-slate-50">
                {isRTL ? "إلغاء التحديد" : "Effacer"}
              </button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => validateResults(undefined, true)} disabled={validating}
                className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
                {validating ? "..." : (isRTL ? "تأكيد جميع المقبولين" : "Valider tous les approuvés")}
              </button>
              {selectedForFinal.size > 0 && (
                <button onClick={() => validateResults(Array.from(selectedForFinal), true)} disabled={validating}
                  className="px-4 py-1.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50">
                  {validating ? "..." : (isRTL ? `تأكيد ${selectedForFinal.size} محدد` : `Valider ${selectedForFinal.size} sélectionné(s)`)}
                </button>
              )}
            </div>
          </div>

          {displayCandidates.length === 0 ? (
            <div className="bg-white rounded-xl border p-12 text-center shadow-sm">
              <p className="text-muted-foreground">
                {isRTL ? "لا يوجد مترشحون" : "Aucun candidat"}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="p-3 w-10"></th>
                    <th className="text-center p-3 font-medium w-12">#</th>
                    <th className="text-right p-3 font-medium">{isRTL ? "المترشح" : "Candidat"}</th>
                    <th className="text-right p-3 font-medium hidden md:table-cell">{isRTL ? "رقم بطاقة التعريف" : "CIN"}</th>
                    <th className="text-center p-3 font-medium">{isRTL ? "الملف" : "Dossier"}</th>
                    <th className="text-center p-3 font-medium">{isRTL ? "الشفاهي" : "Oral"}</th>
                    <th className="text-center p-3 font-medium">{isRTL ? "المجموع" : "Total"}</th>
                    <th className="text-center p-3 font-medium">{isRTL ? "الحالة" : "Statut"}</th>
                  </tr>
                </thead>
                <tbody>
                  {displayCandidates.map((rc, idx) => {
                    const isFinal = rc.status === "FINAL_LIST";
                    return (
                      <tr key={rc.applicationId} className={`border-b last:border-0 hover:bg-slate-50 transition-colors ${isFinal ? "bg-teal-50/40" : ""}`}>
                        <td className="p-3 text-center">
                          <input type="checkbox" checked={selectedForFinal.has(rc.applicationId)}
                            onChange={() => toggleFinalSelection(rc.applicationId)} className="rounded" />
                        </td>
                        <td className="p-3 text-center font-bold text-muted-foreground">{rc.rank || idx + 1}</td>
                        <td className="p-3">
                          <div className="font-medium">{rc.candidate.fullName}</div>
                          <div className="text-xs text-muted-foreground">{rc.candidate.email}</div>
                        </td>
                        <td className="p-3 text-xs font-mono hidden md:table-cell">{rc.candidate.cin}</td>
                        <td className="p-3 text-center font-bold text-blue-600">
                          {rc.applicationScore || 0}
                        </td>
                        <td className="p-3 text-center font-bold text-purple-600">
                          {rc.oralTotal || 0}
                        </td>
                        <td className="p-3 text-center font-bold text-primary">
                          {rc.weightedScore}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`text-xs font-medium rounded-full px-2.5 py-1 ${
                            isFinal ? "bg-teal-100 text-teal-800" :
                            rc.status === "APPROVED" ? "bg-green-50 text-green-700" :
                            rc.status === "ORAL_TEST" ? "bg-purple-50 text-purple-700" :
                            "bg-amber-50 text-amber-700"
                          }`}>
                            {isFinal
                              ? (isRTL ? "✓ قائمة نهائية" : "✓ Liste finale")
                              : (rc.status === "APPROVED" ? (isRTL ? "مقبول" : "Approuvé") :
                                 rc.status === "ORAL_TEST" ? (isRTL ? "اختبار شفوي" : "Oral") :
                                 rc.status)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {scoreDossierModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setScoreDossierModal(null)}>
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-lg font-bold">{isRTL ? "نتيجة الملف" : "Score Dossier"}</h2>
                <p className="text-sm text-muted-foreground">{scoreDossierModal.candidateName}</p>
              </div>
              <button onClick={() => setScoreDossierModal(null)} className="text-muted-foreground hover:text-foreground text-xl">&times;</button>
            </div>
            <div className="text-xs text-muted-foreground mb-4 p-3 bg-slate-50 rounded-lg">
              {isRTL
                ? "(معدل الباكالوريا × 0.5) + ((معدل السنة الأولى + معدل السنة الثانية + معدل السنة الثالثة) × 0.5)"
                : "(Moyenne Bac × 0.5) + ((Moyenne 1ère + Moyenne 2ème + Moyenne 3ème) × 0.5)"}
            </div>
            {scoreDossierLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : !scoreDossierData?.academicInfo ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {isRTL ? "لا توجد معلومات أكاديمية" : "Aucune information académique"}
              </p>
            ) : (
              <div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">{isRTL ? "معدل الباكالوريا" : "Moy. Bac"}</label>
                    <input type="text" value={scoreDossierEdit.moyenneBac}
                      onChange={(e) => setScoreDossierEdit(prev => ({ ...prev, moyenneBac: e.target.value }))}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">{isRTL ? "معدل السنة الأولى" : "Moy. 1ère"}</label>
                    <input type="text" value={scoreDossierEdit.moyenne1ere}
                      onChange={(e) => setScoreDossierEdit(prev => ({ ...prev, moyenne1ere: e.target.value }))}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">{isRTL ? "معدل السنة الثانية" : "Moy. 2ème"}</label>
                    <input type="text" value={scoreDossierEdit.moyenne2eme}
                      onChange={(e) => setScoreDossierEdit(prev => ({ ...prev, moyenne2eme: e.target.value }))}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">{isRTL ? "معدل السنة الثالثة" : "Moy. 3ème"}</label>
                    <input type="text" value={scoreDossierEdit.moyenne3eme}
                      onChange={(e) => setScoreDossierEdit(prev => ({ ...prev, moyenne3eme: e.target.value }))}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm" />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t">
                  <div className="text-sm">
                    <span className="text-muted-foreground">{isRTL ? "النتيجة:" : "Score:"}</span>{" "}
                    <span className="font-bold text-blue-600 text-lg">
                      {(() => {
                        const mBac = parseFloat(scoreDossierEdit.moyenneBac) || 0;
                        const m1 = parseFloat(scoreDossierEdit.moyenne1ere) || 0;
                        const m2 = parseFloat(scoreDossierEdit.moyenne2eme) || 0;
                        const m3 = parseFloat(scoreDossierEdit.moyenne3eme) || 0;
                        return Math.round(((mBac * 0.5) + (((m1 + m2 + m3) / 3) * 0.5)) * 100) / 100;
                      })()}
                    </span>
                  </div>
                  <button onClick={async () => {
                    setScoreDossierSaving(true);
                    try {
                      const res = await fetch(`/api/applications/${scoreDossierModal.applicationId}/academic-info`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(scoreDossierEdit),
                      });
                      if (res.ok) {
                        setScoreDossierModal(null);
                        fetchData();
                      } else {
                        const err = await res.json();
                        alert(err.error || (isRTL ? "خطأ في الحفظ" : "Erreur"));
                      }
                    } catch { alert(isRTL ? "خطأ في الحفظ" : "Erreur"); }
                    finally { setScoreDossierSaving(false); }
                  }} disabled={scoreDossierSaving}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
                    {scoreDossierSaving ? (isRTL ? "..." : "...") : (isRTL ? "حفظ" : "Enregistrer")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
