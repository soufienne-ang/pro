"use client";

import { useState, useEffect, useCallback } from "react";

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
  _count: { applications: number };
}

export default function AdminCandidatesPage() {
  const [locale, setLocale] = useState("fr");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const segments = window.location.pathname.split("/");
    setLocale(segments[1] || "fr");
  }, []);

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (search) params.set("search", search);
    try {
      const res = await fetch(`/api/candidates?${params}`);
      if (res.ok) { const d = await res.json(); setCandidates(d.candidates); setTotal(d.pagination?.total || 0); }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchCandidates(); }, [fetchCandidates]);

  const handleSearch = () => { setPage(1); fetchCandidates(); };

  const isRTL = locale === "ar";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{isRTL ? "المرشحين" : "Candidats"}</h1>
        <span className="text-sm text-muted-foreground">{total} {isRTL ? "مرشح" : "candidat(s)"}</span>
      </div>

      <div className="bg-white rounded-xl border p-4 shadow-sm mb-6">
        <div className="flex gap-2">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder={isRTL ? "بحث بالاسم أو البريد الإلكتروني أو CIN" : "Recherche nom, email ou CIN"}
            className="flex-1 h-10 rounded-md border border-input bg-background px-3 text-sm" />
          <button onClick={handleSearch}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
            {isRTL ? "بحث" : "Rechercher"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : candidates.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center shadow-sm">
          <p className="text-muted-foreground">{isRTL ? "لا يوجد مرشحين" : "Aucun candidat"}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-slate-50 text-sm">
                <th className="text-left p-3 font-medium">{isRTL ? "الاسم" : "Nom"}</th>
                <th className="text-left p-3 font-medium hidden md:table-cell">Email</th>
                <th className="text-left p-3 font-medium hidden lg:table-cell">CIN</th>
                <th className="text-left p-3 font-medium hidden lg:table-cell">{isRTL ? "الهاتف" : "Tél"}</th>
                <th className="text-left p-3 font-medium hidden md:table-cell">{isRTL ? "الولاية" : "Gouvernorat"}</th>
                <th className="text-center p-3 font-medium">{isRTL ? "الطلبات" : "Candidatures"}</th>
                <th className="text-center p-3 font-medium hidden md:table-cell">{isRTL ? "الحالة" : "Statut"}</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map(c => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="p-3 text-sm font-medium">{c.fullName}</td>
                  <td className="p-3 text-sm text-muted-foreground hidden md:table-cell">{c.email}</td>
                  <td className="p-3 text-sm font-mono hidden lg:table-cell">{c.cin}</td>
                  <td className="p-3 text-sm hidden lg:table-cell">{c.phone}</td>
                  <td className="p-3 text-sm hidden md:table-cell">{c.governorate}</td>
                  <td className="p-3 text-center text-sm">{c._count.applications}</td>
                  <td className="p-3 text-center">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.isEmailVerified ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                      {c.isEmailVerified ? (isRTL ? "موثق" : "Vérifié") : (isRTL ? "غير موثق" : "Non vérifié")}
                    </span>
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
    </div>
  );
}
