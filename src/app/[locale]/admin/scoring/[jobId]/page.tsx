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
  rank: number;
}

type TabKey = "criteria" | "scoring" | "ranking" | "validation";

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

  const [newCriterionName, setNewCriterionName] = useState("");
  const [newCriterionWeight, setNewCriterionWeight] = useState("1");
  const [editingCriterion, setEditingCriterion] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ name: string; weight: string }>({ name: "", weight: "" });

  const [localScores, setLocalScores] = useState<Record<string, Record<string, string>>>({});
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [selectedForFinal, setSelectedForFinal] = useState<Set<string>>(new Set());

  const canManageCriteria = userRole === "SUPER_ADMIN" || userRole === "HR_AGENT" || userRole === "COMMISSION" || userRole === "REVIEWER";
  const canValidate = userRole === "SUPER_ADMIN" || userRole === "COMMISSION" || userRole === "JURY_MEMBER";

  useEffect(() => {
    const segments = window.location.pathname.split("/");
    setLocale(segments[1] || "fr");
  }, []);

  useEffect(() => {
    if (canManageCriteria) {
      setActiveTab("criteria");
    }
  }, [canManageCriteria]);

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

  const addCriterion = async () => {
    if (!newCriterionName.trim() || !newCriterionWeight) return;
    try {
      const res = await fetch("/api/scoring/criteria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, name: newCriterionName.trim(), weight: parseFloat(newCriterionWeight) }),
      });
      if (res.ok) {
        const added = await res.json();
        setCriteria((prev) => [...prev, added]);
        setNewCriterionName("");
        setNewCriterionWeight("1");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const updateCriterion = async (id: string) => {
    try {
      const res = await fetch(`/api/scoring/criteria/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editValues.name,
          weight: parseFloat(editValues.weight),
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setCriteria((prev) => prev.map((c) => (c.id === id ? updated : c)));
        setEditingCriterion(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteCriterion = async (id: string) => {
    if (!confirm(isRTL ? "هل أنت متأكد من الحذف؟" : "Confirmer la suppression ?")) return;
    try {
      const res = await fetch(`/api/scoring/criteria/${id}`, { method: "DELETE" });
      if (res.ok) {
        setCriteria((prev) => prev.filter((c) => c.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const startEdit = (c: Criterion) => {
    setEditingCriterion(c.id);
    setEditValues({ name: c.name, weight: String(c.weight) });
  };

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

  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);

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
        {canManageCriteria && (
          <button onClick={() => setActiveTab("criteria")}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeTab === "criteria"
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}>
            {isRTL ? "معايير التقييم" : "Critères"}
          </button>
        )}
        <button onClick={() => setActiveTab("scoring")}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            activeTab === "scoring"
              ? "bg-white text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}>
          {isRTL ? "تقييم المرشحين" : "Notation"}
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

      {activeTab === "criteria" && (
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">
            {isRTL ? "معايير التقييم" : "Critères d'évaluation"}
          </h2>

          <div className="space-y-3 mb-6">
            {criteria.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {isRTL ? "لا توجد معايير بعد. أضف المعيار الأول." : "Aucun critère défini. Ajoutez le premier critère."}
              </p>
            ) : (
              criteria.map((c) => (
                <div key={c.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  {editingCriterion === c.id ? (
                    <>
                      <input type="text" value={editValues.name}
                        onChange={(e) => setEditValues((v) => ({ ...v, name: e.target.value }))}
                        className="flex-1 h-8 rounded-md border border-input bg-background px-2 text-sm" />
                      <input type="number" value={editValues.weight} min="0.1" step="0.1"
                        onChange={(e) => setEditValues((v) => ({ ...v, weight: e.target.value }))}
                        className="w-20 h-8 rounded-md border border-input bg-background px-2 text-sm text-center" />
                      <span className="text-xs text-muted-foreground w-12">
                        {((c.weight / (totalWeight || 1)) * 100).toFixed(0)}%
                      </span>
                      <button onClick={() => updateCriterion(c.id)}
                        className="px-2 py-1 bg-primary text-primary-foreground rounded text-xs font-medium">
                        {isRTL ? "حفظ" : "Sauver"}
                      </button>
                      <button onClick={() => setEditingCriterion(null)}
                        className="px-2 py-1 border rounded text-xs">
                        {isRTL ? "إلغاء" : "Annuler"}
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm font-medium">{c.name}</span>
                      <span className="text-sm font-mono text-muted-foreground">×{c.weight}</span>
                      <span className="text-xs text-muted-foreground w-12">
                        {((c.weight / (totalWeight || 1)) * 100).toFixed(0)}%
                      </span>
                      <button onClick={() => startEdit(c)}
                        className="px-2 py-1 border rounded text-xs hover:bg-slate-100">
                        {isRTL ? "تعديل" : "Modifier"}
                      </button>
                      <button onClick={() => deleteCriterion(c.id)}
                        className="px-2 py-1 border rounded text-xs text-destructive hover:bg-red-50">
                        {isRTL ? "حذف" : "Suppr."}
                      </button>
                    </>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-medium mb-3">
              {isRTL ? "إضافة معيار جديد" : "Ajouter un critère"}
            </h3>
            <div className="flex items-center gap-3">
              <input type="text" value={newCriterionName}
                onChange={(e) => setNewCriterionName(e.target.value)}
                placeholder={isRTL ? "اسم المعيار" : "Nom du critère"}
                className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm"
                onKeyDown={(e) => e.key === "Enter" && addCriterion()} />
              <input type="number" value={newCriterionWeight} min="0.1" step="0.1"
                onChange={(e) => setNewCriterionWeight(e.target.value)}
                className="w-24 h-9 rounded-md border border-input bg-background px-3 text-sm text-center" />
              <span className="text-xs text-muted-foreground">
                {isRTL ? "الوزن" : "Poids"}
              </span>
              <button onClick={addCriterion}
                className="px-4 h-9 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                + {isRTL ? "إضافة" : "Ajouter"}
              </button>
            </div>
          </div>
        </div>
      )}

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
                {isRTL ? "لا يوجد مرشحون" : "Aucun candidat"}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="text-left p-3 font-medium whitespace-nowrap">{isRTL ? "المرشح" : "Candidat"}</th>
                    <th className="text-left p-3 font-medium hidden md:table-cell">CIN</th>
                    {criteria.map((c) => (
                      <th key={c.id} className="text-center p-3 font-medium min-w-[100px]">
                        <div className="text-xs">{c.name}</div>
                        <div className="text-[10px] text-muted-foreground">×{c.weight}</div>
                      </th>
                    ))}
                    <th className="text-center p-3 font-medium whitespace-nowrap">
                      {isRTL ? "المجموع" : "Total"}
                    </th>
                    <th className="text-center p-3 font-medium">{isRTL ? "الحالة" : "Statut"}</th>
                    <th className="text-right p-3 font-medium">{isRTL ? "إجراءات" : "Actions"}</th>
                  </tr>
                </thead>
                <tbody>
                  {displayCandidates.map((rc) => {
                    const totalScore = rc.scores.reduce((sum, s) => sum + s.value * (s.weight / (totalWeight || 1)), 0);
                    return (
                      <tr key={rc.applicationId} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                        <td className="p-3">
                          <div className="font-medium">{rc.candidate.fullName}</div>
                          <div className="text-xs text-muted-foreground">{rc.candidate.email}</div>
                        </td>
                        <td className="p-3 text-xs font-mono hidden md:table-cell">{rc.candidate.cin}</td>
                        {criteria.map((c) => (
                          <td key={c.id} className="p-1 text-center">
                            <input type="number" min="0" max="20" step="0.5"
                              value={localScores[rc.applicationId]?.[c.id] || ""}
                              onChange={(e) => handleScoreChange(rc.applicationId, c.id, e.target.value)}
                              className="w-16 h-8 rounded border border-input bg-background px-1 text-sm text-center" />
                          </td>
                        ))}
                        <td className="p-3 text-center font-semibold">
                          {Math.round(totalScore * 100) / 100}
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
                          <button onClick={() => saveScores(rc.applicationId)}
                            className="px-2 py-1 border rounded text-xs hover:bg-slate-100">
                            {isRTL ? "حفظ" : "Sauver"}
                          </button>
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
                    <th className="text-left p-3 font-medium">{isRTL ? "المرشح" : "Candidat"}</th>
                    <th className="text-left p-3 font-medium hidden md:table-cell">CIN</th>
                    <th className="text-left p-3 font-medium hidden lg:table-cell">{isRTL ? "الولاية" : "Gouv."}</th>
                    {criteria.map((c) => (
                      <th key={c.id} className="text-center p-3 font-medium text-xs whitespace-nowrap">
                        {c.name}
                      </th>
                    ))}
                    <th className="text-center p-3 font-medium">{isRTL ? "المجموع" : "Total"}</th>
                    <th className="text-center p-3 font-medium">{isRTL ? "الحالة" : "Statut"}</th>
                  </tr>
                </thead>
                <tbody>
                  {displayCandidates.map((rc, idx) => {
                    const totalScore = rc.scores.reduce((sum, s) => sum + s.value * (s.weight / (totalWeight || 1)), 0);
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
                        <td className="p-3 text-center font-bold text-primary">
                          {Math.round(totalScore * 100) / 100}
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
                ? "حدد المرشحين الذين يجب أن يكونوا في القائمة النهائية، أو اضغط على الزر لتأكيد جميع المرشحين المقبولين."
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
                {isRTL ? "لا يوجد مرشحون" : "Aucun candidat"}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="p-3 w-10"></th>
                    <th className="text-center p-3 font-medium w-12">#</th>
                    <th className="text-left p-3 font-medium">{isRTL ? "المرشح" : "Candidat"}</th>
                    <th className="text-left p-3 font-medium hidden md:table-cell">CIN</th>
                    <th className="text-center p-3 font-medium">{isRTL ? "النتيجة" : "Score"}</th>
                    <th className="text-center p-3 font-medium">{isRTL ? "الحالة" : "Statut"}</th>
                  </tr>
                </thead>
                <tbody>
                  {displayCandidates.map((rc, idx) => {
                    const totalScore = rc.scores.reduce((sum, s) => sum + s.value * (s.weight / (totalWeight || 1)), 0);
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
                        <td className="p-3 text-center font-bold text-primary">
                          {Math.round(totalScore * 100) / 100}
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
    </div>
  );
}
