"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { JobFileUpload } from "@/components/job-file-upload";

export default function EditJobPage() {
  const router = useRouter();
  const params = useParams();
  const [locale, setLocale] = useState("fr");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    code: "",
    titleFr: "",
    titleAr: "",
    descriptionFr: "",
    descriptionAr: "",
    location: "",
    jobType: "",
    profile: "ACADEMIC",
    minEduLevel: "SECONDARY",
    openings: 1,
    deadline: "",
    requiredDocs: "",
    exclusionConditions: "",
    pdfUrl: "",
    imageUrl: "",
    status: "DRAFT",
  });

  const jobId = params.id as string;

  useEffect(() => {
    const segments = window.location.pathname.split("/");
    setLocale(segments[1] || "fr");
  }, []);

  const isRTL = locale === "ar";

  useEffect(() => {
    if (!jobId) return;
    fetch(`/api/jobs/${jobId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch job");
        return res.json();
      })
      .then((data) => {
        setForm({
          code: data.code || "",
          titleFr: data.titleFr || "",
          titleAr: data.titleAr || "",
          descriptionFr: data.descriptionFr || "",
          descriptionAr: data.descriptionAr || "",
          location: data.location || "",
          jobType: data.jobType || "",
          profile: data.profile || "ACADEMIC",
          minEduLevel: data.minEduLevel || "SECONDARY",
          openings: data.openings || 1,
          deadline: data.deadline ? data.deadline.split("T")[0] : "",
          requiredDocs: data.requiredDocs || "",
          exclusionConditions: data.exclusionConditions || "",
          pdfUrl: data.pdfUrl || "",
          imageUrl: data.imageUrl || "",
          status: data.status || "DRAFT",
        });
        setLoading(false);
      })
      .catch(() => {
        setError(isRTL ? "فشل في تحميل بيانات المناظرة" : "Échec du chargement des données");
        setLoading(false);
      });
  }, [jobId, isRTL]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "PUT",
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

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">{isRTL ? "تعديل المناظرة" : "Modifier l'offre d'emploi"}</h1>

      {error && <div className="mb-4 p-3 text-sm text-destructive bg-destructive/10 rounded-lg">{error}</div>}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-6 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{isRTL ? "رمز المناظرة" : "Code"} *</label>
            <input type="text" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{isRTL ? "نوع المناظرة" : "Type"} *</label>
            <input type="text" value={form.jobType} onChange={e => setForm({ ...form, jobType: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{isRTL ? "فئة المترشحين" : "Candidate track"} *</label>
            <select
              value={form.profile}
              onChange={e => setForm({ ...form, profile: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="ACADEMIC">{isRTL ? "فئة أولى — يتطلب شهادة دراسية" : "Academic — diploma required"}</option>
              <option value="MANUAL">{isRTL ? "فئة ثانية — بدون شهادة دراسية" : "Manual — no diploma required"}</option>
            </select>
            <p className="text-xs text-muted-foreground">
              {isRTL
                ? "الفئة الأولى: مهندسون، إداريون، تقنيون. الفئة الثانية: صيانة، متعدد المهارات، porterie."
                : "Academic: engineers, administrators, technicians. Manual: maintenance, multi-skilled workers, cleaners."}
            </p>
          </div>
          {form.profile === "MANUAL" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">{isRTL ? "المستوى الدراسي المطلوب" : "Minimum education level"} *</label>
              <select
                value={form.minEduLevel}
                onChange={e => setForm({ ...form, minEduLevel: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="NONE">{isRTL ? "بدون شهادة" : "No diploma"}</option>
                <option value="PRIMARY">{isRTL ? "ابتدائي" : "Primary"}</option>
                <option value="MIDDLE">{isRTL ? "إعدادي" : "Middle school"}</option>
                <option value="SECONDARY">{isRTL ? "ثانوي" : "Secondary"}</option>
                <option value="VOCATIONAL">{isRTL ? "تكوين مهني" : "Vocational training"}</option>
              </select>
            </div>
          )}
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
            <JobFileUpload
              type="pdf"
              accept=".pdf,application/pdf"
              label={isRTL ? "ملف PDF بلاغ المناظرة" : "Fichier PDF"}
              hint={isRTL ? "PDF فقط" : "PDF uniquement"}
              value={form.pdfUrl}
              onChange={(url) => setForm({ ...form, pdfUrl: url })}
              uploading={uploadingPdf}
              onUploadingChange={setUploadingPdf}
              isRTL={isRTL}
            />
          </div>
          <div className="space-y-2">
            <JobFileUpload
              type="image"
              accept=".jpg,.jpeg,.png,image/jpeg,image/png"
              label={isRTL ? "صورة اعلان المناظرة" : "Image"}
              hint={isRTL ? "JPG, PNG" : "JPG, PNG"}
              value={form.imageUrl}
              onChange={(url) => setForm({ ...form, imageUrl: url })}
              uploading={uploadingImage}
              onUploadingChange={setUploadingImage}
              isRTL={isRTL}
            />
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

        <div className="space-y-2">
          <label className="text-sm font-medium">{isRTL ? "شروط الإقصاء" : "Conditions d'exclusion"}</label>
          <textarea value={form.exclusionConditions} onChange={e => setForm({ ...form, exclusionConditions: e.target.value })}
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" rows={3} />
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving}
            className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50">
            {saving
              ? (isRTL ? "جار الحفظ..." : "Enregistrement...")
              : (isRTL ? "حفظ التغييرات" : "Enregistrer les modifications")}
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
