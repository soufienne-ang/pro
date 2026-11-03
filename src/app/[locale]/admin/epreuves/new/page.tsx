"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Job {
  id: string;
  titleAr: string;
  titleFr: string;
  code: string;
}

export default function NewEpreuvePage() {
  const router = useRouter();
  const [locale, setLocale] = useState("fr");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    titleAr: "",
    titleFr: "",
    jobId: "",
    type: "WRITTEN",
    coefficient: "1",
    duration: "",
    description: "",
    examDate: "",
    examTime: "",
  });

  useEffect(() => {
    const segments = window.location.pathname.split("/");
    setLocale(segments[1] || "fr");
  }, []);

  useEffect(() => {
    fetch("/api/jobs?status=ALL")
      .then((r) => r.ok && r.json())
      .then((data) => setJobs(data || []))
      .catch(() => {});
  }, []);

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const payload = {
        titleAr: form.titleAr,
        titleFr: form.titleFr,
        jobId: form.jobId,
        type: form.type,
        coefficient: parseFloat(form.coefficient),
        duration: form.duration ? parseInt(form.duration, 10) : null,
        description: form.description || null,
      };

      const res = await fetch("/api/epreuves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const created = await res.json();
        // Create session(s) if exam date/time provided
        if (form.examDate) {
          try {
            const start = form.examTime || "08:00";
            // End time: +4h if duration not set, else start + duration
            let end = "12:00";
            if (form.examTime) {
              const [h, m] = form.examTime.split(":").map(Number);
              const endH = (h + 4) % 24;
              end = `${String(endH).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
            }
            await fetch(`/api/epreuves/${created.id}/sessions`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                date: form.examDate,
                startTime: start,
                endTime: end,
                type: "MAIN",
              }),
            });
          } catch {}
        }
        router.push(`/${locale}/admin/epreuves`);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || (isRTL ? "حدث خطأ" : "Une erreur est survenue"));
      }
    } catch {
      setError(isRTL ? "حدث خطأ في الاتصال" : "Erreur de connexion");
    } finally {
      setSubmitting(false);
    }
  };

  const isRTL = locale === "ar";

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{isRTL ? "إنشاء امتحان جديد" : "Nouvel examen"}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isRTL ? "أدخل معلومات الامتحان" : "Saisissez les informations de l'examen"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border shadow-sm p-6 space-y-5">
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">
              {isRTL ? "العنوان (بالعربية)" : "Titre (arabe)"} *
            </label>
            <input type="text" value={form.titleAr}
              onChange={(e) => update("titleAr", e.target.value)} required
              placeholder="عنوان الامتحان بالعربية"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">
              {isRTL ? "العنوان (بالفرنسية)" : "Titre (français)"} *
            </label>
            <input type="text" value={form.titleFr}
              onChange={(e) => update("titleFr", e.target.value)} required
              placeholder="Titre de l'examen en français"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">
            {isRTL ? "المناظرة المرتبطة" : "Poste associé"} *
          </label>
          <select value={form.jobId} onChange={(e) => update("jobId", e.target.value)} required
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            <option value="">{isRTL ? "اختر مناظرة" : "Sélectionner un poste"}</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.code} - {isRTL ? j.titleAr : j.titleFr}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">
              {isRTL ? "النوع" : "Type"} *
            </label>
            <select value={form.type} onChange={(e) => update("type", e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              <option value="WRITTEN">{isRTL ? "تحريري" : "Écrit"}</option>
              <option value="ORAL">{isRTL ? "شفوي" : "Oral"}</option>
              <option value="PRACTICAL">{isRTL ? "تطبيقي" : "Pratique"}</option>
              <option value="SPORTS">{isRTL ? "رياضي" : "Sport"}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">
              {isRTL ? "المعدل/" : "Coefficient"} *
            </label>
            <input type="number" value={form.coefficient} min="0.1" step="0.1"
              onChange={(e) => update("coefficient", e.target.value)} required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">
              {isRTL ? "المدة (دقائق)" : "Durée (minutes)"}
            </label>
            <input type="number" value={form.duration} min="1"
              onChange={(e) => update("duration", e.target.value)}
              placeholder="60"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">
              {isRTL ? "تاريخ الامتحان" : "Date d'examen"}
            </label>
            <input type="date" value={form.examDate}
              onChange={(e) => update("examDate", e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">
              {isRTL ? "توقيت الامتحان" : "Heure d'examen"}
            </label>
            <input type="time" value={form.examTime}
              onChange={(e) => update("examTime", e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">
            {isRTL ? "الوصف" : "Description"}
          </label>
          <textarea value={form.description}
            onChange={(e) => update("description", e.target.value)} rows={4}
            placeholder={isRTL ? "وصف الامتحان..." : "Description de l'examen..."}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={submitting}
            className="px-6 h-10 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
            {submitting
              ? (isRTL ? "جاري الحفظ..." : "Enregistrement...")
              : (isRTL ? "حفظ" : "Enregistrer")}
          </button>
          <button type="button" onClick={() => router.back()}
            className="px-6 h-10 border rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
            {isRTL ? "إلغاء" : "Annuler"}
          </button>
        </div>
      </form>
    </div>
  );
}
