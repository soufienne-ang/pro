"use client";

import { useState, useEffect, useCallback } from "react";
import { Label } from "@/components/ui/label";

interface Job {
  id: string;
  code: string;
  titleAr: string;
  titleFr: string;
}

interface Application {
  id: string;
  status: string;
  submittedAt: string;
  totalScore: number | null;
  candidate: { id: string; fullName: string; email: string; cin: string; phone: string; governorate: string; };
  job: { id: string; code: string; titleFr: string; titleAr: string; };
  documents: Array<{ id: string; fileName: string; fileUrl: string; }>;
}

const STATUSES = ["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED", "ORAL_TEST", "FINAL_LIST"];
const STATUS_CFG: Record<string, { label: Record<string, string>; color: string }> = {
  PENDING: { label: { ar: "قيد الانتظار", fr: "En attente" }, color: "bg-amber-50 text-amber-700" },
  UNDER_REVIEW: { label: { ar: "قيد المراجعة", fr: "En cours" }, color: "bg-blue-50 text-blue-700" },
  APPROVED: { label: { ar: "مقبول", fr: "Approuvé" }, color: "bg-green-50 text-green-700" },
  REJECTED: { label: { ar: "مرفوض", fr: "Rejeté" }, color: "bg-red-50 text-red-700" },
  ORAL_TEST: { label: { ar: "اختبار شفوي", fr: "Oral" }, color: "bg-purple-50 text-purple-700" },
  FINAL_LIST: { label: { ar: "قائمة نهائية", fr: "Liste finale" }, color: "bg-teal-50 text-teal-700" },
};

export default function AdminApplicationsPage() {
  const [locale, setLocale] = useState("fr");
  const [apps, setApps] = useState<Application[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: "", search: "", jobId: "", page: 1 });
  const [total, setTotal] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailApp, setDetailApp] = useState<Application | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const statusParam = params.get("status") || "";
    setFilters(f => ({ ...f, status: statusParam }));
    const segments = window.location.pathname.split("/");
    setLocale(segments[1] || "fr");
    fetch("/api/jobs?status=ALL")
      .then(r => r.ok ? r.json() : [])
      .then(j => setJobs(Array.isArray(j) ? j : []))
      .catch(() => {});
  }, []);

  const fetchApps = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.search) params.set("search", filters.search);
    if (filters.jobId) params.set("jobId", filters.jobId);
    params.set("page", String(filters.page));
    params.set("limit", "20");
    try {
      const res = await fetch(`/api/applications?${params}`);
      if (res.ok) { const d = await res.json(); setApps(d.applications); setTotal(d.pagination?.total || 0); }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filters.status, filters.search, filters.jobId, filters.page]);

  useEffect(() => { fetchApps(); }, [fetchApps]);

  const handleSearch = () => { setFilters(f => ({ ...f, page: 1 })); fetchApps(); };

  const updateStatus = async (id: string, status: string) => {
    const res = await fetch(`/api/applications/${id}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) fetchApps();
  };

  const bulkUpdate = async (status: string) => {
    const ids = Array.from(selectedIds);
    await Promise.all(ids.map(id => updateStatus(id, status)));
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const isRTL = locale === "ar";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{isRTL ? "المترشحين" : "Candidatures"}</h1>
      </div>

      <div className="bg-white rounded-xl border p-4 shadow-sm mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 flex-wrap">
            <button onClick={() => setFilters(f => ({ ...f, status: "", page: 1 }))}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium ${!filters.status ? "bg-primary text-primary-foreground" : "border hover:bg-slate-50"}`}>
              {isRTL ? "الكل" : "Tous"}
            </button>
            {STATUSES.map(s => (
              <button key={s} onClick={() => setFilters(f => ({ ...f, status: s, page: 1 }))}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium ${filters.status === s ? "bg-primary text-primary-foreground" : "border hover:bg-slate-50"}`}>
                {isRTL ? STATUS_CFG[s].label.ar : STATUS_CFG[s].label.fr}
              </button>
            ))}
          </div>
          <div className="flex gap-2 ml-auto items-center">
            <select value={filters.jobId} onChange={e => setFilters(f => ({ ...f, jobId: e.target.value, page: 1 }))}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm min-w-[180px]">
              <option value="">{isRTL ? "كل المناظرات" : "Tous les concours"}</option>
              {jobs.map(j => (
                <option key={j.id} value={j.id}>{j.code} — {isRTL ? j.titleAr : j.titleFr}</option>
              ))}
            </select>
            <input type="text" value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder={isRTL ? "بحث بالاسم أو بطاقة التعريف الوطنية" : "Recherche nom/CIN"}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm w-48" />
            <button onClick={handleSearch}
              className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm">
              {isRTL ? "بحث" : "Rechercher"}
            </button>
            <a href={`/api/applications/export?search=${filters.search}&jobId=${filters.jobId}&status=${filters.status}`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border hover:bg-slate-50 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              XLS
            </a>
          </div>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 mb-4 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium">{selectedIds.size} {isRTL ? "محدد" : "sélectionné(s)"}</span>
          {["UNDER_REVIEW", "APPROVED", "REJECTED", "ORAL_TEST"].map(s => (
            <button key={s} onClick={() => bulkUpdate(s)}
              className="px-3 py-1 text-xs rounded-lg bg-white border hover:bg-slate-50 transition-colors">
              {isRTL ? STATUS_CFG[s].label.ar : STATUS_CFG[s].label.fr}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : apps.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center shadow-sm">
          <p className="text-muted-foreground">{isRTL ? "لا توجد طلبات" : "Aucune candidature"}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-slate-50 text-sm">
                <th className="p-3 w-10"><input type="checkbox" onChange={e => {
                  if (e.target.checked) setSelectedIds(new Set(apps.map(a => a.id)));
                  else setSelectedIds(new Set());
                }} checked={selectedIds.size === apps.length && apps.length > 0} className="rounded" /></th>
                <th className="text-right p-3 font-medium">{isRTL ? "المترشح" : "Candidat"}</th>
                <th className="text-right p-3 font-medium hidden md:table-cell">{isRTL ? "المناظرة" : "Poste"}</th>
                <th className="text-right p-3 font-medium hidden lg:table-cell">{isRTL ? "بطاقة التعريف الوطنية" : "CIN"}</th>
                <th className="text-center p-3 font-medium">{isRTL ? "الحالة" : "Statut"}</th>
                <th className="text-right p-3 font-medium">{isRTL ? "إجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {apps.map(app => {
                const sc = STATUS_CFG[app.status] || STATUS_CFG.PENDING;
                return (
                  <tr key={app.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="p-3"><input type="checkbox" checked={selectedIds.has(app.id)} onChange={() => toggleSelect(app.id)} className="rounded" /></td>
                    <td className="p-3">
                      <div className="text-sm font-medium">{app.candidate.fullName}</div>
                      <div className="text-xs text-muted-foreground">{app.candidate.email}</div>
                    </td>
                    <td className="p-3 text-sm hidden md:table-cell">{isRTL ? app.job.titleAr : app.job.titleFr}</td>
                    <td className="p-3 text-sm font-mono hidden lg:table-cell">{app.candidate.cin}</td>
                    <td className="p-3 text-center">
                      <select value={app.status} onChange={e => updateStatus(app.id, e.target.value)}
                        className={`text-xs font-medium rounded-full px-2 py-1 border-0 ${sc.color} cursor-pointer`}>
                        {STATUSES.map(s => (
                          <option key={s} value={s}>{isRTL ? STATUS_CFG[s].label.ar : STATUS_CFG[s].label.fr}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => { setDetailApp(app); setEditStatus(app.status); setStatusNote(""); }}
                          className="text-xs text-primary hover:underline cursor-pointer">
                          {isRTL ? "عرض" : "Voir"}
                        </button>
                        <button onClick={async () => {
                          if (!window.confirm(isRTL ? "هل أنت متأكد من حذف هذه الترشح؟" : "Confirmer la suppression de cette candidature ?")) return;
                          const res = await fetch(`/api/applications/${app.id}`, { method: "DELETE" });
                          if (res.ok) fetchApps(); else alert(isRTL ? "فشل الحذف" : "Échec de la suppression");
                        }} className="text-xs font-medium px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
                          {isRTL ? "حذف" : "Supprimer"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {total > 20 && (
            <div className="flex justify-between items-center p-4 border-t text-sm text-muted-foreground">
              <span>{isRTL ? `صفحة ${filters.page}` : `Page ${filters.page}`}</span>
              <div className="flex gap-2">
                <button disabled={filters.page <= 1} onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
                  className="px-3 py-1 border rounded hover:bg-slate-50 disabled:opacity-50">←</button>
                <button disabled={filters.page * 20 >= total} onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
                  className="px-3 py-1 border rounded hover:bg-slate-50 disabled:opacity-50">→</button>
              </div>
            </div>
          )}
        </div>
      )}

      {detailApp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDetailApp(null)}>
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-bold">{isRTL ? "تفاصيل الطلب" : "Détails de la candidature"}</h2>
              <button onClick={() => setDetailApp(null)} className="text-muted-foreground hover:text-foreground text-xl">&times;</button>
            </div>

            <div className="space-y-3 mb-6 pb-4 border-b">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{isRTL ? "معلومات المترشح" : "Informations candidat"}</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">{isRTL ? "الاسم" : "Nom"}:</span> <span className="font-medium">{detailApp.candidate.fullName}</span></div>
                <div><span className="text-muted-foreground">Email:</span> <span>{detailApp.candidate.email}</span></div>
                <div><span className="text-muted-foreground">{isRTL ? "بطاقة التعريف الوطنية" : "CIN"}:</span> <span className="font-mono">{detailApp.candidate.cin}</span></div>
                <div><span className="text-muted-foreground">{isRTL ? "الهاتف" : "Tél"}:</span> <span>{detailApp.candidate.phone}</span></div>
                <div><span className="text-muted-foreground">{isRTL ? "الولاية" : "Gouvernorat"}:</span> <span>{detailApp.candidate.governorate}</span></div>
                <div><span className="text-muted-foreground">{isRTL ? "الوظيفة" : "Poste"}:</span> <span>{isRTL ? detailApp.job.titleAr : detailApp.job.titleFr}</span></div>
              </div>
              {detailApp.submittedAt && (
                <p className="text-xs text-muted-foreground mt-2">
                  {isRTL ? "تاريخ التقديم: " : "Soumis le: "}{new Date(detailApp.submittedAt).toLocaleDateString()}
                </p>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{isRTL ? "تحديث الحالة" : "Mettre à jour le statut"}</h3>
              <div>
                <Label className="text-sm mb-1 block">{isRTL ? "الحالة" : "Statut"}</Label>
                <select value={editStatus} onChange={e => setEditStatus(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  {STATUSES.map(s => (
                    <option key={s} value={s}>{isRTL ? STATUS_CFG[s].label.ar : STATUS_CFG[s].label.fr}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-sm mb-1 block">{isRTL ? "ملاحظة (اختياري)" : "Note (optionnelle)"}</Label>
                <textarea value={statusNote} onChange={e => setStatusNote(e.target.value)} rows={2}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                  placeholder={isRTL ? "سبب تغيير الحالة..." : "Raison du changement de statut..."} />
              </div>
              <button onClick={async () => {
                setSavingStatus(true);
                try {
                  const res = await fetch(`/api/applications/${detailApp.id}/status`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: editStatus, note: statusNote || undefined }),
                  });
                  if (res.ok) { setDetailApp(null); fetchApps(); }
                  else alert(isRTL ? "فشل التحديث" : "Échec de la mise à jour");
                } catch { alert("Erreur"); }
                finally { setSavingStatus(false); }
              }} disabled={savingStatus || editStatus === detailApp.status}
                className="w-full px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
                {savingStatus ? (isRTL ? "جاري الحفظ..." : "Enregistrement...") : (isRTL ? "تحديث الحالة" : "Mettre à jour le statut")}
              </button>

              {detailApp.documents.length > 0 && (
                <div className="pt-4 border-t">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">{isRTL ? "الوثائق" : "Documents"}</h3>
                  <div className="space-y-1">
                    {detailApp.documents.map(doc => (
                      <a key={doc.id} href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                        className="block text-sm text-primary hover:underline">{doc.fileName}</a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
