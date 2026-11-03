"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Job {
  id: string;
  titleAr: string;
  titleFr: string;
  code: string;
}

export default function EditEpreuvePage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();

  const [locale, setLocale] = useState("fr");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
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
    Promise.all([
      fetch("/api/jobs?status=ALL").then((r) => r.ok ? r.json() : []),
      fetch(`/api/epreuves/${id}`).then((r) => r.ok ? r.json() : null),
    ]).then(([jobsData, exam]) => {
      setJobs(jobsData || []);
      if (exam) {
        // Try to populate exam date/time from first session if exists
        const firstSession = exam.sessions?.[0];
        const examDate = firstSession?.date ? new Date(firstSession.date).toISOString().split("T")[0] : "";
        const examTime = firstSession?.startTime || "";
        setForm({
          titleAr: exam.titleAr || "",
          titleFr: exam.titleFr || "",
          jobId: exam.jobId || "",
          type: exam.type || "WRITTEN",
          coefficient: String(exam.coefficient || "1"),
          duration: exam.duration ? String(exam.duration) : "",
          description: exam.description || "",
          examDate,
          examTime,
        });
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

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

      const res = await fetch(`/api/epreuves/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        // Sync exam date/time to session if provided
        if (form.examDate) {
          try {
            const start = form.examTime || "08:00";
            let end = "12:00";
            if (form.examTime) {
              const [h, m] = form.examTime.split(":").map(Number);
              const endH = (h + 4) % 24;
              end = `${String(endH).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
            }
            const sessRes = await fetch(`/api/epreuves/${id}/sessions`);
            if (sessRes.ok) {
              const sessions = await sessRes.json();
              if (sessions.length > 0) {
                const firstId = sessions[0].id;
                await fetch(`/api/calendar/${firstId}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    date: form.examDate,
                    startTime: start,
                    endTime: end,
                  }),
                }).catch(() => {});
              } else {
                await fetch(`/api/epreuves/${id}/sessions`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    date: form.examDate,
                    startTime: start,
                    endTime: end,
                    type: "MAIN",
                  }),
                });
              }
            } else {
              await fetch(`/api/epreuves/${id}/sessions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  date: form.examDate,
                  startTime: start,
                  endTime: end,
                  type: "MAIN",
                }),
              });
            }
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

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href={`/${locale}/admin/epreuves`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {isRTL ? "الامتحانات" : "Examens"}
            </Link>
            <span className="text-muted-foreground">/</span>
          </div>
          <h1 className="text-2xl font-bold">{isRTL ? "تعديل الامتحان" : "Modifier l'examen"}</h1>
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
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">
              {isRTL ? "العنوان (بالفرنسية)" : "Titre (français)"} *
            </label>
            <input type="text" value={form.titleFr}
              onChange={(e) => update("titleFr", e.target.value)} required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">
            {isRTL ? "الوظيفة المرتبطة" : "Poste associé"} *
          </label>
          <select value={form.jobId} onChange={(e) => update("jobId", e.target.value)} required
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            <option value="">{isRTL ? "اختر وظيفة" : "Sélectionner un poste"}</option>
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
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={submitting}
            className="px-6 h-10 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
            {submitting
              ? (isRTL ? "جاري الحفظ..." : "Enregistrement...")
              : (isRTL ? "تحديث" : "Mettre à jour")}
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
