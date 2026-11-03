"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface ConvocationItem {
  id: string;
  status: string;
  submittedAt: string | null;
  candidate: { fullName: string; email: string; cin: string };
  job: { id: string; code: string; titleFr: string; titleAr: string };
}

interface Template {
  id: string;
  name: string;
  isDefault: boolean;
  jobId: string | null;
}

const ELIGIBLE = ["APPROVED", "ORAL_TEST"];

const STATUS_CFG: Record<string, { label: Record<string, string>; color: string }> = {
  APPROVED: { label: { ar: "مقبول", fr: "Approuvé" }, color: "bg-green-50 text-green-700" },
  ORAL_TEST: { label: { ar: "اختبار شفوي", fr: "Oral" }, color: "bg-purple-50 text-purple-700" },
  FINAL_LIST: { label: { ar: "قائمة نهائية", fr: "Liste finale" }, color: "bg-teal-50 text-teal-700" },
};

export default function AdminConvocationsPage() {
  const [locale, setLocale] = useState("fr");
  const [items, setItems] = useState<ConvocationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [jobFilter, setJobFilter] = useState("");
  const [jobs, setJobs] = useState<Array<{ id: string; titleFr: string; titleAr: string }>>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [generating, setGenerating] = useState<string | null>(null);
  const [sending, setSending] = useState<string | null>(null);

  useEffect(() => {
    const segments = window.location.pathname.split("/");
    setLocale(segments[1] || "fr");
  }, []);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/jobs?status=ALL");
      if (res.ok) {
        const data = await res.json();
        setJobs(data.map((j: { id: string; titleFr: string; titleAr: string }) => ({ id: j.id, titleFr: j.titleFr, titleAr: j.titleAr })));
      }
    } catch (e) { console.error(e); }
  }, []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const results: ConvocationItem[] = [];
      for (const status of ELIGIBLE) {
        const res = await fetch(`/api/applications?status=${status}&limit=100`);
        if (res.ok) {
          const d = await res.json();
          if (jobFilter) {
            results.push(...(d.applications as ConvocationItem[]).filter((a) => a.job.id === jobFilter));
          } else {
            results.push(...(d.applications as ConvocationItem[]));
          }
        }
      }
      setItems(results);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [jobFilter]);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/convocation-templates");
      if (res.ok) {
        const d = await res.json();
        setTemplates(d.templates);
      }
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    if (jobFilter) {
      const linked = templates.find((t: Template) => t.jobId === jobFilter);
      if (linked) {
        setSelectedTemplate(linked.id);
        return;
      }
    }
    const def = templates.find((t: Template) => t.isDefault);
    if (def) setSelectedTemplate(def.id);
  }, [jobFilter, templates]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);
  useEffect(() => { fetchItems(); }, [fetchItems]);
  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const downloadConvocation = async (id: string) => {
    setGenerating(id);
    try {
      const params = new URLSearchParams();
      if (selectedTemplate) params.set("templateId", selectedTemplate);
      const res = await fetch(`/api/applications/${id}/convocation?${params.toString()}`);
      if (!res.ok) throw new Error("Generation failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `convocation-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert(isRTL ? "خطأ في إنشاء الاستدعاء" : "Erreur lors de la génération");
    } finally {
      setGenerating(null);
    }
  };

  const sendConvocation = async (id: string) => {
    setSending(id);
    try {
      const params: Record<string, string> = {};
      if (selectedTemplate) params.templateId = selectedTemplate;
      const res = await fetch(`/api/applications/${id}/send-convocation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (res.ok) {
        alert(isRTL ? "تم إرسال الاستدعاء بنجاح" : "Convocation envoyée avec succès");
      } else {
        const d = await res.json();
        alert(d.error || "Error");
      }
    } catch {
      alert(isRTL ? "خطأ في الإرسال" : "Erreur d'envoi");
    } finally {
      setSending(null);
    }
  };

  const deleteConvocation = async (id: string) => {
    const ok = confirm(isRTL ? "هل أنت متأكد من حذف هذه الاستدعاء/الطلب؟" : "Confirmer la suppression de cette candidature ?");
    if (!ok) return;
    const res = await fetch(`/api/applications/${id}`, { method: "DELETE" });
    if (res.ok) setItems((prev) => prev.filter((it) => it.id !== id));
    else alert(isRTL ? "فشل الحذف" : "Échec de la suppression");
  };

  const isRTL = locale === "ar";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{isRTL ? "إدارة الاستدعاءات" : "Gestion des convocations"}</h1>
        <Link href={`/${locale}/admin/convocations/templates`}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
          {isRTL ? "قوالب الاستدعاءات" : "Modèles de convocations"}
        </Link>
      </div>

      <div className="bg-white rounded-xl border p-4 shadow-sm mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-muted-foreground">{isRTL ? "المناظرة" : "Concours"}:</label>
          <select value={jobFilter} onChange={(e) => setJobFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm min-w-[200px]">
            <option value="">{isRTL ? "الكل" : "Tous"}</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>{isRTL ? j.titleAr : j.titleFr}</option>
            ))}
          </select>
          <label className="text-sm text-muted-foreground">{isRTL ? "القالب" : "Modèle"}:</label>
          <select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm min-w-[180px]">
            <option value="">{isRTL ? "بدون قالب" : "Sans modèle"}</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <span className="text-sm text-muted-foreground ml-auto">
            {isRTL ? `${items.length} مترشح` : `${items.length} candidat(s)`}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center shadow-sm">
          <p className="text-muted-foreground">
            {isRTL ? "لا يوجد مترشحون " : "Aucun candidat éligible"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-slate-50 text-sm">
                <th className="text-right p-3 font-medium">{isRTL ? "المترشح" : "Candidat"}</th>
                <th className="text-right p-3 font-medium hidden md:table-cell">{isRTL ? "بطاقة التعريف الوطنية" : "CIN"}</th>
                <th className="text-right p-3 font-medium hidden md:table-cell">{isRTL ? "المناظرة" : "Concours"}</th>
                <th className="text-center p-3 font-medium">{isRTL ? "الحالة" : "Statut"}</th>
                <th className="text-center p-3 font-medium">{isRTL ? "إجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const sc = STATUS_CFG[it.status] || { label: { ar: it.status, fr: it.status }, color: "bg-slate-100 text-slate-700" };
                return (
                  <tr key={it.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="p-3">
                      <div className="text-sm font-medium">{it.candidate.fullName}</div>
                      <div className="text-xs text-muted-foreground">{it.candidate.email}</div>
                    </td>
                    <td className="p-3 text-sm font-mono hidden md:table-cell">{it.candidate.cin}</td>
                    <td className="p-3 text-sm hidden md:table-cell">{isRTL ? it.job.titleAr : it.job.titleFr}</td>
                    <td className="p-3 text-center">
                      <span className={`text-xs font-medium rounded-full px-2.5 py-1 ${sc.color}`}>
                        {isRTL ? sc.label.ar : sc.label.fr}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => sendConvocation(it.id)}
                          disabled={sending === it.id}
                          className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50 cursor-pointer"
                        >
                          {sending === it.id
                            ? (isRTL ? "جاري الإرسال..." : "Envoi...")
                            : (isRTL ? "إرسال بالبريد" : "Envoyer par email")}
                        </button>
                        <button
                          onClick={() => downloadConvocation(it.id)}
                          disabled={generating === it.id}
                          className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
                        >
                          {generating === it.id
                            ? (isRTL ? "جاري الإنشاء..." : "Génération...")
                            : (isRTL ? "تحميل PDF" : "Télécharger PDF")}
                        </button>
                        <button
                          onClick={() => deleteConvocation(it.id)}
                          className="px-3 py-1.5 bg-destructive text-destructive-foreground rounded-lg text-xs font-medium hover:bg-destructive/90 cursor-pointer"
                        >
                          {isRTL ? "حذف" : "Supprimer"}
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
  );
}
