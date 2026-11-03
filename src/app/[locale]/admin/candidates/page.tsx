"use client";

import Image from "next/image";
import { useState, useEffect, useCallback } from "react";

interface Job {
  id: string;
  code: string;
  titleAr: string;
  titleFr: string;
}

interface Candidate {
  id: string;
  fullName: string;
  email: string;
  cin: string;
  phone: string;
  governorate: string;
  delegation: string;
  isEmailVerified: boolean;
  hasExperience: boolean;
  createdAt: string;
  _count: { applications: number; documents: number };
  applicationJob: Job | null;
}

interface DocumentItem {
  id: string;
  type: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  application: { job: { code: string; titleFr: string; titleAr: string } } | null;
}

const GOVERNORATES = [
  "Ariana","Béja","Ben Arous","Bizerte","Gabès","Gafsa","Jendouba","Kairouan","Kasserine","Kébili","Le Kef","Mahdia","Manouba","Medenine","Monastir","Nabeul","Sfax","Sidi Bouzid","Siliana","Sousse","Tataouine","Tozeur","Tunis","Zaghouan",
];

export default function AdminCandidatesPage() {
  const [locale, setLocale] = useState("fr");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [jobId, setJobId] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [docModal, setDocModal] = useState<{ candidateName: string; documents: DocumentItem[] } | null>(null);
  const [editCandidate, setEditCandidate] = useState<Candidate | null>(null);
  const [editForm, setEditForm] = useState({ fullName: "", email: "", phone: "", governorate: "", delegation: "", address: "", isEmailVerified: false });
  const [saving, setSaving] = useState(false);


  useEffect(() => {
    const segments = window.location.pathname.split("/");
    setLocale(segments[1] || "fr");
    fetch("/api/jobs?status=ALL")
      .then(r => r.ok ? r.json() : [])
      .then(j => setJobs(Array.isArray(j) ? j : []))
      .catch(() => {});
  }, []);

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (search) params.set("search", search);
    if (jobId) params.set("jobId", jobId);
    try {
      const res = await fetch(`/api/candidates?${params}`);
      if (res.ok) { const d = await res.json(); setCandidates(d.candidates); setTotal(d.pagination?.total || 0); }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, search, jobId]);

  useEffect(() => { fetchCandidates(); }, [fetchCandidates]);

  const handleSearch = () => { setPage(1); fetchCandidates(); };

  const openDocuments = async (candidate: Candidate) => {
    try {
      const res = await fetch(`/api/candidates/${candidate.id}/documents`);
      if (res.ok) {
        const d = await res.json();
        setDocModal({ candidateName: candidate.fullName, documents: d.documents });
      }
    } catch (e) { console.error(e); }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " o";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " Ko";
    return (bytes / 1048576).toFixed(1) + " Mo";
  };

  const isRTL = locale === "ar";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{isRTL ? "المسجلين" : "Candidats"}</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{total} {isRTL ? "مسجل" : "candidat(s)"}</span>
          <a href={`/api/candidates/export?search=${search}&jobId=${jobId}`}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border hover:bg-slate-50 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            XLS
          </a>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-4 shadow-sm mb-6 space-y-3">
        <div className="flex gap-2">
          <select value={jobId} onChange={e => { setJobId(e.target.value); setPage(1); }}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm min-w-[200px]">
            <option value="">{isRTL ? "كل المناظرات" : "Tous les concours"}</option>
            {jobs.map(j => (
              <option key={j.id} value={j.id}>{j.code} — {isRTL ? j.titleAr : j.titleFr}</option>
            ))}
          </select>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder={isRTL ? "بحث بالاسم أو البريد الإلكتروني أو بطاقة التعريف الوطنية" : "Recherche nom, email ou CIN"}
            className="flex-1 h-10 rounded-md border border-input bg-background px-3 text-sm" />
          <button onClick={handleSearch}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
            {isRTL ? "بحث" : "Rechercher"}
          </button>
        </div>
      </div>

      {docModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDocModal(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[85vh] overflow-auto mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold">{docModal.candidateName}</h2>
              <button onClick={() => setDocModal(null)} className="text-muted-foreground hover:text-foreground text-xl leading-none">&times;</button>
            </div>
            <div className="p-4">
              {docModal.documents.length === 0 ? (
                <p className="text-muted-foreground text-sm">{isRTL ? "لا توجد وثائق" : "Aucun document"}</p>
              ) : (
                <div className="space-y-3">
                  {docModal.documents.map(doc => (
                    <div key={doc.id} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{doc.fileName}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.type} — {formatSize(doc.fileSize)}
                            {doc.application && ` — ${doc.application.job.code}`}
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                            className="px-2.5 py-1 text-xs font-medium rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                            {isRTL ? "عرض" : "Voir"}
                          </a>
                          <a href={doc.fileUrl} download={doc.fileName}
                            className="px-2.5 py-1 text-xs font-medium rounded border hover:bg-slate-50 transition-colors">
                            {isRTL ? "تحميل" : "Télécharger"}
                          </a>
                        </div>
                      </div>
                      {doc.mimeType?.startsWith("image/") && (
                        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="block mt-2">
<Image src={doc.fileUrl} alt={doc.fileName}
    className="w-full max-h-40 object-contain rounded border bg-slate-50"
    width={400} height={160} unoptimized />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : candidates.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center shadow-sm">
          <p className="text-muted-foreground">{isRTL ? "لا يوجد مسجلين" : "Aucun candidat"}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-slate-50 text-sm">
                <th className="text-right p-3 font-medium">{isRTL ? "الاسم" : "Nom"}</th>
                <th className="text-right p-3 font-medium hidden lg:table-cell">{isRTL ? "المناظرة" : "Concours"}</th>
                <th className="text-right p-3 font-medium hidden lg:table-cell">{isRTL ? "البريد الإلكتروني" : "Email"}</th>
                <th className="text-right p-3 font-medium hidden lg:table-cell">{isRTL ? "رقم بطاقة التعريف الوطنية" : "CIN"}</th>
                <th className="text-right p-3 font-medium hidden lg:table-cell">{isRTL ? "الهاتف" : "Tél"}</th>
                <th className="text-right p-3 font-medium hidden md:table-cell">{isRTL ? "الولاية" : "Gouvernorat"}</th>
                <th className="text-center p-3 font-medium">{isRTL ? "الوثائق" : "Documents"}</th>
                <th className="text-center p-3 font-medium hidden md:table-cell">{isRTL ? "الحالة" : "Statut"}</th>
                <th className="text-center p-3 font-medium w-20">{isRTL ? "إجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map(c => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="p-3 text-sm font-medium">{c.fullName}</td>
                  <td className="p-3 text-sm text-muted-foreground hidden lg:table-cell">
                    {c.applicationJob ? (isRTL ? c.applicationJob.titleAr : c.applicationJob.titleFr) : "—"}
                  </td>
                  <td className="p-3 text-sm text-muted-foreground hidden md:table-cell">{c.email}</td>
                  <td className="p-3 text-sm font-mono hidden lg:table-cell">{c.cin}</td>
                  <td className="p-3 text-sm hidden lg:table-cell">{c.phone}</td>
                  <td className="p-3 text-sm hidden md:table-cell">{c.governorate}</td>
                  <td className="p-3 text-center">
                    <button onClick={() => openDocuments(c)}
                      className="text-xs font-medium px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 transition-colors">
                      {c._count.documents}
                    </button>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.isEmailVerified ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                      {c.isEmailVerified ? (isRTL ? "موثق" : "Vérifié") : (isRTL ? "غير موثق" : "Non vérifié")}
                    </span>
                  </td>
                    <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => { setEditCandidate(c); setEditForm({ fullName: c.fullName, email: c.email, phone: c.phone, governorate: c.governorate, delegation: c.delegation, address: "", isEmailVerified: c.isEmailVerified }); }}
                        className="text-xs font-medium px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                        {isRTL ? "تعديل" : "Modifier"}
                      </button>
                      <button onClick={async () => {
                        if (!window.confirm(isRTL ? "هل أنت متأكد من حذف هذا المسجل؟" : "Confirmer la suppression de ce candidat ?")) return;
                        const res = await fetch(`/api/candidates/${c.id}`, { method: "DELETE" });
                        if (res.ok) fetchCandidates(); else alert(isRTL ? "فشل الحذف" : "Échec de la suppression");
                      }} className="text-xs font-medium px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
                        {isRTL ? "حذف" : "Supprimer"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {total > 20 && (
            <div className="flex justify-between items-center p-4 border-t text-sm text-muted-foreground">
              <span>{isRTL ? `صفحة ${page}` : `Page ${page}`}</span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1 border rounded hover:bg-slate-50 disabled:opacity-50">←</button>
                <button disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1 border rounded hover:bg-slate-50 disabled:opacity-50">→</button>
              </div>
            </div>
          )}
        </div>
      )}
      {editCandidate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setEditCandidate(null)}>
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-bold">{isRTL ? "تعديل المسجل" : "Modifier le candidat"}</h2>
              <button onClick={() => setEditCandidate(null)} className="text-muted-foreground hover:text-foreground text-xl">&times;</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1">{isRTL ? "الاسم الكامل" : "Nom complet"}</label>
                <input type="text" value={editForm.fullName} onChange={e => setEditForm(f => ({ ...f, fullName: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Email</label>
                <input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">{isRTL ? "الهاتف" : "Téléphone"}</label>
                <input type="text" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">{isRTL ? "الولاية" : "Gouvernorat"}</label>
                <select value={editForm.governorate} onChange={e => setEditForm(f => ({ ...f, governorate: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  {GOVERNORATES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">{isRTL ? "المعتمدية" : "Délégation"}</label>
                <input type="text" value={editForm.delegation} onChange={e => setEditForm(f => ({ ...f, delegation: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="verifyEmail" checked={editForm.isEmailVerified}
                  onChange={e => setEditForm(f => ({ ...f, isEmailVerified: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600" />
                <label htmlFor="verifyEmail" className="text-sm font-medium">{isRTL ? "البريد الإلكتروني موثق" : "Email vérifié"}</label>
              </div>
              <div className="flex gap-3 justify-end pt-2 border-t">
                <button onClick={() => setEditCandidate(null)}
                  className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-slate-50 transition-colors">
                  {isRTL ? "إلغاء" : "Annuler"}
                </button>
                <button onClick={async () => {
                  if (!editCandidate) return;
                  setSaving(true);
                  try {
                    const res = await fetch(`/api/candidates/${editCandidate.id}`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(editForm),
                    });
                    if (res.ok) { setEditCandidate(null); fetchCandidates(); }
                    else { const err = await res.json(); alert(err.error || "Erreur"); }
                  } catch { alert("Erreur"); }
                  finally { setSaving(false); }
                }} disabled={saving} className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  {saving ? (isRTL ? "جاري الحفظ..." : "Enregistrement...") : (isRTL ? "حفظ" : "Enregistrer")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
