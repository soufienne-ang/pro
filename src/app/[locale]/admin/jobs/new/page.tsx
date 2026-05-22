"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NewJobPage() {
  const router = useRouter();
  const [locale, setLocale] = useState("fr");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    code: "",
    titleFr: "",
    titleAr: "",
    descriptionFr: "",
    descriptionAr: "",
    location: "",
    jobType: "",
    openings: 1,
    deadline: "",
    requiredDocs: "",
    pdfUrl: "",
    imageUrl: "",
    status: "PUBLISHED",
  });

  useEffect(() => {
    const segments = window.location.pathname.split("/");
    setLocale(segments[1] || "fr");
  }, []);

  const isRTL = locale === "ar";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        router.push(`/${locale}/admin/jobs`);
      } else {
        const data = await res.json();
        setError(data.error || "Error");
      }
    } catch {
      setError(isRTL ? "حدث خطأ" : "Une erreur est survenue");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">{isRTL ? "إضافة وظيفة جديدة" : "Nouvelle offre d'emploi"}</h1>

      {error && <div className="mb-4 p-3 text-sm text-destructive bg-destructive/10 rounded-lg">{error}</div>}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-6 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{isRTL ? "رمز الوظيفة" : "Code"} *</label>
            <input type="text" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{isRTL ? "نوع الوظيفة" : "Type"} *</label>
            <input type="text" value={form.jobType} onChange={e => setForm({ ...form, jobType: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{isRTL ? "الحالة" : "Statut"}</label>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="PUBLISHED">{isRTL ? "منشورة" : "Publié"}</option>
              <option value="DRAFT">{isRTL ? "مسودة" : "Brouillon"}</option>
              <option value="CLOSED">{isRTL ? "مغلقة" : "Fermé"}</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{isRTL ? "العنوان (بالعربية)" : "Titre (AR)"} *</label>
            <input type="text" value={form.titleAr} onChange={e => setForm({ ...form, titleAr: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{isRTL ? "العنوان (بالفرنسية)" : "Titre (FR)"} *</label>
            <input type="text" value={form.titleFr} onChange={e => setForm({ ...form, titleFr: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{isRTL ? "الموقع" : "Lieu"} *</label>
            <input type="text" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{isRTL ? "عدد المناصب" : "Postes"} *</label>
            <input type="number" min={1} value={form.openings} onChange={e => setForm({ ...form, openings: parseInt(e.target.value) || 1 })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{isRTL ? "آخر أجل" : "Date limite"} *</label>
            <input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{isRTL ? "رابط PDF" : "URL PDF"}</label>
            <input type="url" value={form.pdfUrl} onChange={e => setForm({ ...form, pdfUrl: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{isRTL ? "رابط الصورة" : "URL Image"}</label>
            <input type="url" value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{isRTL ? "الوصف (بالعربية)" : "Description (AR)"}</label>
            <textarea value={form.descriptionAr} onChange={e => setForm({ ...form, descriptionAr: e.target.value })}
              className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" rows={4} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{isRTL ? "الوصف (بالفرنسية)" : "Description (FR)"}</label>
            <textarea value={form.descriptionFr} onChange={e => setForm({ ...form, descriptionFr: e.target.value })}
              className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" rows={4} />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{isRTL ? "الوثائق المطلوبة" : "Documents requis"}</label>
          <textarea value={form.requiredDocs} onChange={e => setForm({ ...form, requiredDocs: e.target.value })}
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" rows={3} />
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving}
            className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50">
            {saving
              ? (isRTL ? "جار الحفظ..." : "Enregistrement...")
              : form.status === "PUBLISHED"
                ? (isRTL ? "نشر العرض" : "Publier l'offre")
                : (isRTL ? "إنشاء كمسودة" : "Créer comme brouillon")}
          </button>
          <button type="button" onClick={() => router.back()}
            className="px-6 py-2.5 border rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium">
            {isRTL ? "إلغاء" : "Annuler"}
          </button>
        </div>
      </form>
    </div>
  );
}
