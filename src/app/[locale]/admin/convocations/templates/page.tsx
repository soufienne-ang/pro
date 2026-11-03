"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface Template {
  id: string;
  name: string;
  titleAr: string;
  titleFr: string;
  headerAr: string;
  headerFr: string;
  footerAr: string | null;
  footerFr: string | null;
  logoUrl: string | null;
  fields: string[];
  isDefault: boolean;
  jobId: string | null;
  job?: { id: string; code: string; titleAr: string; titleFr: string } | null;
  createdAt: string;
  updatedAt: string;
}

const AVAILABLE_FIELDS: { key: string; labelAr: string; labelFr: string }[] = [
  { key: "fullName", labelAr: "الاسم الكامل", labelFr: "Nom complet" },
  { key: "cin", labelAr: "رقم بطاقة التعريف الوطنية", labelFr: "CIN" },
  { key: "email", labelAr: "البريد الإلكتروني", labelFr: "Email" },
  { key: "phone", labelAr: "الهاتف", labelFr: "Téléphone" },
  { key: "dateOfBirth", labelAr: "تاريخ الولادة", labelFr: "Date de naissance" },
  { key: "address", labelAr: "العنوان", labelFr: "Adresse" },
  { key: "governorate", labelAr: "الولاية", labelFr: "Gouvernorat" },
  { key: "delegation", labelAr: "المعتمدية", labelFr: "Délégation" },
  { key: "gender", labelAr: "الجنس", labelFr: "Genre" },
  { key: "jobTitle", labelAr: "الخطة", labelFr: "Poste" },
  { key: "jobCode", labelAr: "رمز الخطة", labelFr: "Code poste" },
  { key: "status", labelAr: "حالة الطلب", labelFr: "Statut candidature" },
  { key: "submittedAt", labelAr: "تاريخ التقديم", labelFr: "Date de soumission" },
  { key: "studyLevel", labelAr: "المستوى الدراسي", labelFr: "Niveau d'études" },
  { key: "diploma", labelAr: "الشهادة", labelFr: "Diplôme" },
  { key: "institution", labelAr: "المؤسسة", labelFr: "Établissement" },
  { key: "graduationYear", labelAr: "سنة التخرج", labelFr: "Année graduation" },
  { key: "gpa", labelAr: "المعدل العام", labelFr: "Moyenne générale" },
  { key: "examType", labelAr: "نوع الاختبار", labelFr: "Type d'examen" },
  { key: "examDate", labelAr: "تاريخ الامتحان", labelFr: "Date d'examen" },
  { key: "examTime", labelAr: "توقيت الامتحان", labelFr: "Heure d'examen" },
  { key: "_requiredDocs", labelAr: "الوثائق المطلوبة", labelFr: "Documents requis" },
  { key: "_uploadedDocs", labelAr: "الوثائق المرفوعة", labelFr: "Documents fournis" },
  { key: "_signature", labelAr: "التوقيع", labelFr: "Signature" },
];

export default function ConvocationTemplatesPage() {
  const router = useRouter();
  const [locale, setLocale] = useState("fr");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Template | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [jobs, setJobs] = useState<Array<{ id: string; code: string; titleAr: string; titleFr: string }>>([]);
  const [form, setForm] = useState({
    name: "",
    titleAr: "",
    titleFr: "",
    headerAr: "",
    headerFr: "",
    footerAr: "أنت مدعو لإجتياز الإختبار الشفاهي يوم : ../../2026 على الساعة : ..: .. مصحوبا بهذا الإستدعاء",
    footerFr: "",
    logoUrl: "",
    fields: [] as string[],
    isDefault: false,
    jobId: "",
  });

  useEffect(() => {
    const segments = window.location.pathname.split("/");
    setLocale(segments[1] || "fr");
  }, []);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/convocation-templates");
      if (res.ok) {
        const d = await res.json();
        setTemplates(d.templates);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/jobs?status=ALL");
      if (res.ok) {
        const data = await res.json();
        setJobs(data.map((j: { id: string; code: string; titleAr: string; titleFr: string }) => ({ id: j.id, code: j.code, titleAr: j.titleAr, titleFr: j.titleFr })));
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);
  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const isRTL = locale === "ar";

  const resetForm = () => {
    setForm({ name: "", titleAr: "", titleFr: "", headerAr: "", headerFr: "", footerAr: "أنت مدعو لإجتياز الإختبار الشفاهي يوم : ../../2026 على الساعة : ..: .. مصحوبا بهذا الإستدعاء", footerFr: "", logoUrl: "", fields: [], isDefault: false, jobId: "" });
    setEditing(null);
  };

  const openEdit = (t: Template) => {
    setForm({
      name: t.name,
      titleAr: t.titleAr,
      titleFr: t.titleFr,
      headerAr: t.headerAr,
      headerFr: t.headerFr,
      footerAr: t.footerAr || "",
      footerFr: t.footerFr || "",
      logoUrl: t.logoUrl || "",
      fields: (t.fields as string[]) || [],
      isDefault: t.isDefault,
      jobId: t.jobId || "",
    });
    setEditing(t);
    setShowForm(true);
    setError("");
  };

  const toggleField = (key: string) => {
    setForm(prev => ({
      ...prev,
      fields: prev.fields.includes(key)
        ? prev.fields.filter(f => f !== key)
        : [...prev.fields, key],
    }));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/convocation-templates/${editing.id}/logo`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const d = await res.json();
        setForm(prev => ({ ...prev, logoUrl: d.logoUrl }));
      }
    } catch {
      // ignore
    } finally {
      setUploadingLogo(false);
      e.target.value = "";
    }
  };

  const handleRemoveLogo = async () => {
    if (!editing) return;
    try {
      const res = await fetch(`/api/convocation-templates/${editing.id}/logo`, {
        method: "DELETE",
      });
      if (res.ok) {
        setForm(prev => ({ ...prev, logoUrl: "" }));
      }
    } catch {
      // ignore
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const url = editing
        ? `/api/convocation-templates/${editing.id}`
        : "/api/convocation-templates";
      const method = editing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setShowForm(false);
        resetForm();
        fetchTemplates();
      } else {
        const d = await res.json();
        setError(d.error || "Error");
      }
    } catch {
      setError(isRTL ? "حدث خطأ" : "Une erreur est survenue");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/convocation-templates/${id}`, { method: "DELETE" });
      if (res.ok) {
        setDeleteConfirmId(null);
        fetchTemplates();
      }
    } catch {
      // ignore
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <button onClick={() => router.push(`/${locale}/admin/convocations`)}
            className="text-sm text-muted-foreground hover:text-foreground mb-1 inline-block cursor-pointer">
            &larr; {isRTL ? "العودة إلى الاستدعاءات" : "Retour aux convocations"}
          </button>
          <h1 className="text-2xl font-bold">{isRTL ? "قوالب الاستدعاءات" : "Modèles de convocations"}</h1>
        </div>
        {!showForm && (
          <button onClick={() => { resetForm(); setShowForm(true); setError(""); }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer">
            + {isRTL ? "قالب جديد" : "Nouveau modèle"}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 text-sm text-destructive bg-destructive/10 rounded-lg">{error}</div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-6 shadow-sm mb-6 space-y-6">
          <h2 className="text-lg font-bold mb-2">
            {editing
              ? (isRTL ? "تعديل القالب" : "Modifier le modèle")
              : (isRTL ? "قالب جديد" : "Nouveau modèle")}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{isRTL ? "اسم القالب" : "Nom du modèle"} *</label>
              <input type="text" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required />
            </div>
            <div className="space-y-2 flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.isDefault}
                  onChange={e => setForm({ ...form, isDefault: e.target.checked })}
                  className="rounded" />
                {isRTL ? "قالب افتراضي" : "Modèle par défaut"}
              </label>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{isRTL ? "المنشور المرتبط" : "Concours lié"}</label>
              <select value={form.jobId} onChange={e => setForm({ ...form, jobId: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">{isRTL ? "— عام (غير مرتبط)" : "— Général (non lié)"}</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    [{j.code}] {isRTL ? j.titleAr : j.titleFr}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{isRTL ? "العنوان (بالعربية)" : "Titre (AR)"} *</label>
              <input type="text" value={form.titleAr}
                onChange={e => setForm({ ...form, titleAr: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{isRTL ? "العنوان (بالفرنسية)" : "Titre (FR)"} *</label>
              <input type="text" value={form.titleFr}
                onChange={e => setForm({ ...form, titleFr: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required />
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-bold mb-3">{isRTL ? "الرأس (Header)" : "En-tête (Header)"}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{isRTL ? "النص العلوي (بالعربية)" : "Texte d'en-tête (AR)"}</label>
                <textarea value={form.headerAr}
                  onChange={e => setForm({ ...form, headerAr: e.target.value })}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" rows={3} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{isRTL ? "النص العلوي (بالفرنسية)" : "Texte d'en-tête (FR)"}</label>
                <textarea value={form.headerFr}
                  onChange={e => setForm({ ...form, headerFr: e.target.value })}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" rows={3} />
              </div>
            </div>
            <div className="mt-3 space-y-2">
              <label className="text-sm font-medium">{isRTL ? "شعار (Logo)" : "Logo"}</label>
              {form.logoUrl ? (
                <div className="flex items-center gap-3">
                  <Image src={form.logoUrl} alt="Logo" className="h-16 w-auto object-contain border rounded"
                  width={64} height={64} unoptimized />
                  <button type="button" onClick={handleRemoveLogo} disabled={!editing}
                    className="text-xs text-destructive hover:underline cursor-pointer disabled:opacity-50">
                    {isRTL ? "إزالة" : "Supprimer"}
                  </button>
                </div>
              ) : (
                <label className="flex h-10 w-full max-w-xs rounded-md border border-dashed border-input bg-background px-3 py-2 text-sm cursor-pointer hover:bg-muted/50 transition-colors items-center">
                  <span className="truncate text-muted-foreground">
                    {uploadingLogo
                      ? (isRTL ? "جار الرفع..." : "Téléchargement...")
                      : (isRTL ? "اختر صورة (JPEG/PNG)" : "Choisir une image (JPEG/PNG)")}
                  </span>
                  <input type="file" accept=".jpg,.jpeg,.png" className="sr-only"
                    onChange={handleLogoUpload} disabled={uploadingLogo || !editing} />
                </label>
              )}
              {!editing && (
                <p className="text-xs text-muted-foreground">{isRTL ? "احفظ القالب أولاً لرفع الشعار" : "Enregistrez d'abord le modèle pour ajouter un logo"}</p>
              )}
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-bold mb-3">{isRTL ? "المحتوى - الحقول المعروضة" : "Contenu - Champs affichés"}</h3>
            <p className="text-xs text-muted-foreground mb-3">
              {isRTL ? "اختر الحقول التي تريد عرضها في الاستدعاء" : "Sélectionnez les champs à afficher dans la convocation"}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {AVAILABLE_FIELDS.map(f => (
                <label key={f.key} className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded hover:bg-slate-50">
                  <input type="checkbox" checked={form.fields.includes(f.key)}
                    onChange={() => toggleField(f.key)} className="rounded" />
                  {isRTL ? f.labelAr : f.labelFr}
                </label>
              ))}
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-bold mb-3">{isRTL ? "التذييل (Footer)" : "Pied de page (Footer)"}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{isRTL ? "النص السفلي (بالعربية)" : "Texte de pied (AR)"}</label>
                <textarea value={form.footerAr}
                  onChange={e => setForm({ ...form, footerAr: e.target.value })}
                 className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" rows={3} />
               
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{isRTL ? "النص السفلي (بالفرنسية)" : "Texte de pied (FR)"}</label>
                <textarea value={form.footerFr}
                  onChange={e => setForm({ ...form, footerFr: e.target.value })}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" rows={3} />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={saving}
              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50 cursor-pointer">
              {saving
                ? (isRTL ? "جار الحفظ..." : "Enregistrement...")
                : (editing
                  ? (isRTL ? "تحديث" : "Mettre à jour")
                  : (isRTL ? "إنشاء" : "Créer"))}
            </button>
            <button type="button" onClick={() => { setShowForm(false); resetForm(); }}
              className="px-6 py-2.5 border rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium cursor-pointer">
              {isRTL ? "إلغاء" : "Annuler"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center shadow-sm">
          <p className="text-muted-foreground">
            {isRTL ? "لا توجد قوالب بعد" : "Aucun modèle pour le moment"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-slate-50 text-sm">
                <th className="text-right p-3 font-medium">{isRTL ? "الاسم" : "Nom"}</th>
                <th className="text-right p-3 font-medium">{isRTL ? "العنوان" : "Titre"}</th>
                <th className="text-center p-3 font-medium">{isRTL ? "الحقول" : "Champs"}</th>
                <th className="text-center p-3 font-medium">{isRTL ? "شعار" : "Logo"}</th>
                <th className="text-center p-3 font-medium">{isRTL ? "افتراضي" : "Défaut"}</th>
                <th className="text-center p-3 font-medium">{isRTL ? "المنشور" : "Concours"}</th>
                <th className="text-center p-3 font-medium">{isRTL ? "تاريخ الإنشاء" : "Créé le"}</th>
                <th className="text-left p-3 font-medium">{isRTL ? "إجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="p-3">
                    <div className="text-sm font-medium">{t.name}</div>
                  </td>
                  <td className="p-3 text-sm text-muted-foreground">
                    {isRTL ? t.titleAr : t.titleFr}
                  </td>
                  <td className="p-3 text-center text-xs text-muted-foreground">
                    {(t.fields as string[])?.length || 0}
                  </td>
                  <td className="p-3 text-center">
                    {t.logoUrl ? (
                      <span className="text-xs text-green-600 font-medium">{isRTL ? "نعم" : "Oui"}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    {t.isDefault ? (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                        {isRTL ? "نعم" : "Oui"}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="p-3 text-center text-xs text-muted-foreground">
                    {t.job ? (
                      <span>[{t.job.code}] {isRTL ? t.job.titleAr : t.job.titleFr}</span>
                    ) : (
                      <span>—</span>
                    )}
                  </td>
                  <td className="p-3 text-center text-sm text-muted-foreground">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-3 text-left">
                    <button onClick={() => openEdit(t)}
                      className="text-xs text-primary hover:underline cursor-pointer ml-3">
                      {isRTL ? "تعديل" : "Modifier"}
                    </button>
                    <button onClick={() => setDeleteConfirmId(t.id)}
                      className="text-xs text-destructive hover:underline cursor-pointer">
                      {isRTL ? "حذف" : "Supprimer"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-bold mb-2">{isRTL ? "تأكيد الحذف" : "Confirmer la suppression"}</h2>
            <p className="text-muted-foreground text-sm mb-4">
              {isRTL ? "هل أنت متأكد من حذف هذا القالب؟" : "Êtes-vous sûr de vouloir supprimer ce modèle ?"}
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors cursor-pointer">
                {isRTL ? "إلغاء" : "Annuler"}
              </button>
              <button onClick={() => handleDelete(deleteConfirmId!)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors cursor-pointer">
                {isRTL ? "حذف" : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
