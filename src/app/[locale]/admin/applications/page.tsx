"use client";

import { useState, useEffect, useCallback } from "react";

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
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: "", search: "", page: 1 });
  const [total, setTotal] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailApp, setDetailApp] = useState<Application | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const statusParam = params.get("status") || "";
    setFilters(f => ({ ...f, status: statusParam }));
    const segments = window.location.pathname.split("/");
    setLocale(segments[1] || "fr");
  }, []);

  const fetchApps = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.search) params.set("search", filters.search);
    params.set("page", String(filters.page));
    params.set("limit", "20");
    try {
      const res = await fetch(`/api/applications?${params}`);
      if (res.ok) { const d = await res.json(); setApps(d.applications); setTotal(d.pagination?.total || 0); }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filters.status, filters.search, filters.page]);

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
        <h1 className="text-2xl font-bold">{isRTL ? "الطلبات" : "Candidatures"}</h1>
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
          <div className="flex gap-2 ml-auto">
            <input type="text" value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder={isRTL ? "بحث بالاسم أو CIN" : "Recherche nom/CIN"}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm w-48" />
            <button onClick={handleSearch}
              className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm">
              {isRTL ? "بحث" : "Rechercher"}
            </button>
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
                <th className="text-left p-3 font-medium">{isRTL ? "المرشح" : "Candidat"}</th>
                <th className="text-left p-3 font-medium hidden md:table-cell">{isRTL ? "الوظيفة" : "Poste"}</th>
                <th className="text-left p-3 font-medium hidden lg:table-cell">CIN</th>
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
                      <button onClick={() => setDetailApp(app)}
                        className="text-xs text-primary hover:underline cursor-pointer">
                        {isRTL ? "عرض" : "Voir"}
                      </button>
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
            <div className="space-y-3">
              <div><span className="text-sm text-muted-foreground">{isRTL ? "المرشح" : "Candidat"}:</span> <span className="text-sm font-medium">{detailApp.candidate.fullName}</span></div>
              <div><span className="text-sm text-muted-foreground">Email:</span> <span className="text-sm">{detailApp.candidate.email}</span></div>
              <div><span className="text-sm text-muted-foreground">CIN:</span> <span className="text-sm font-mono">{detailApp.candidate.cin}</span></div>
              <div><span className="text-sm text-muted-foreground">{isRTL ? "الهاتف" : "Tél"}:</span> <span className="text-sm">{detailApp.candidate.phone}</span></div>
              <div><span className="text-sm text-muted-foreground">{isRTL ? "الولاية" : "Gouvernorat"}:</span> <span className="text-sm">{detailApp.candidate.governorate}</span></div>
              <div><span className="text-sm text-muted-foreground">{isRTL ? "الوظيفة" : "Poste"}:</span> <span className="text-sm">{isRTL ? detailApp.job.titleAr : detailApp.job.titleFr}</span></div>
              <div><span className="text-sm text-muted-foreground">{isRTL ? "الحالة" : "Statut"}:</span>
                <span className={`text-xs font-medium rounded-full px-2 py-0.5 ml-2 ${STATUS_CFG[detailApp.status]?.color || ""}`}>
                  {isRTL ? STATUS_CFG[detailApp.status]?.label.ar || detailApp.status : STATUS_CFG[detailApp.status]?.label.fr || detailApp.status}
                </span>
              </div>
              {detailApp.submittedAt && <div><span className="text-sm text-muted-foreground">{isRTL ? "تاريخ التقديم" : "Soumis le"}:</span> <span className="text-sm">{new Date(detailApp.submittedAt).toLocaleDateString()}</span></div>}
              {detailApp.documents.length > 0 && (
                <div>
                  <span className="text-sm text-muted-foreground">{isRTL ? "الوثائق" : "Documents"}:</span>
                  <div className="mt-1 space-y-1">
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
