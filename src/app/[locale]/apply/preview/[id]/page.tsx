"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

interface PreviewData {
  application: {
    id: string;
    status: string;
    submittedAt: string;
    personalInfo: Record<string, unknown>;
    academicInfo: Record<string, unknown>;
    experienceInfo: Record<string, unknown>;
    candidate: { fullName: string; email: string; phone: string; cin: string; governorate: string; delegation: string };
    job: { titleFr: string; titleAr: string; code: string };
    documents: Array<{ fileName: string; type: string; mimeType: string; fileSize: number }>;
  };
}

function Row({ label, value }: { label: string; value: string | number | undefined | null }) {
  return (
    <div className="flex justify-between py-2 border-b border-slate-100 last:border-0">
      <span className="text-sm font-medium text-slate-500">{label}</span>
      <span className="text-sm text-slate-800">{value || "—"}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-4">
      <h3 className="text-base font-bold text-slate-800 mb-3 pb-2 border-b border-slate-100">{title}</h3>
      {children}
    </div>
  );
}

export default function ApplicationPreviewPage() {
  const router = useRouter();
  const params = useParams();
  const [locale, setLocale] = useState("fr");
  const [data, setData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const appId = params.id as string;

  useEffect(() => {
    const segments = window.location.pathname.split("/");
    setLocale(segments[1] || "fr");
  }, []);

  const isRTL = locale === "ar";

  useEffect(() => {
    if (!appId) return;
    fetch(`/api/applications/${appId}/preview`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then(setData)
      .catch(() => setError(isRTL ? "فشل في تحميل البيانات" : "Échec du chargement"))
      .finally(() => setLoading(false));
  }, [appId, isRTL]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4">
        <div className="p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">{error}</div>
        <button onClick={() => router.back()} className="mt-4 px-4 py-2 text-sm border rounded-lg hover:bg-slate-50">
          {isRTL ? "رجوع" : "Retour"}
        </button>
      </div>
    );
  }

  const app = data.application;
  const pi = app.personalInfo as Record<string, unknown> | null;
  const ai = app.academicInfo as Record<string, unknown> | null;
  const ei = app.experienceInfo as Record<string, unknown> | null;
  const diplomas = (ai?.diplomas as Array<Record<string, unknown>> | undefined) || [];
  const experiences = (ei?.experiences as Array<Record<string, unknown>> | undefined) || [];

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">
          {isRTL ? "معاينة بيانات المترشح" : "Aperçu de la candidature"}
        </h1>
        <button onClick={() => router.back()} className="px-4 py-2 text-sm border rounded-lg hover:bg-slate-50 transition-colors">
          {isRTL ? "رجوع" : "Retour"}
        </button>
      </div>

      <Section title={isRTL ? "المعلومات الشخصية" : "Informations personnelles"}>
        <Row label={isRTL ? "الاسم الكامل" : "Nom complet"} value={app.candidate.fullName} />
        <Row label={isRTL ? "رقم بطاقة التعريف" : "CIN"} value={app.candidate.cin} />
        <Row label={isRTL ? "البريد الإلكتروني" : "Email"} value={app.candidate.email} />
        <Row label={isRTL ? "الهاتف" : "Téléphone"} value={app.candidate.phone} />
        <Row label={isRTL ? "تاريخ الولادة" : "Date de naissance"} value={pi?.dateOfBirth as string} />
        <Row label={isRTL ? "مكان الولادة" : "Lieu de naissance"} value={pi?.birthPlace as string} />
        <Row label={isRTL ? "الجنس" : "Genre"} value={pi?.gender === "MALE" ? (isRTL ? "ذكر" : "Homme") : (isRTL ? "أنثى" : "Femme")} />
        <Row label={isRTL ? "الحالة العائلية" : "Situation familiale"} value={pi?.familyStatus as string} />
        <Row label={isRTL ? "عدد الأبناء" : "Nombre d'enfants"} value={pi?.numberOfChildren as number} />
        <Row label={isRTL ? "الولاية" : "Gouvernorat"} value={app.candidate.governorate} />
        <Row label={isRTL ? "المعتمدية" : "Délégation"} value={app.candidate.delegation} />
      </Section>

      <Section title={isRTL ? "المعلومات الأكاديمية" : "Informations académiques"}>
        {diplomas.length === 0 ? (
          <p className="text-sm text-slate-400">—</p>
        ) : (
          diplomas.map((d, i) => (
            <div key={i} className="mb-3 last:mb-0">
              <div className="text-xs font-semibold text-slate-400 mb-1">#{i + 1}</div>
              <Row label={isRTL ? "المستوى الدراسي" : "Niveau"} value={d.studyLevel as string} />
              <Row label={isRTL ? "الشهادة" : "Diplôme"} value={d.diploma as string} />
              <Row label={isRTL ? "المؤسسة" : "Institution"} value={d.institution as string} />
              <Row label={isRTL ? "المعدل" : "Grade"} value={d.grade as string} />
              <Row label={isRTL ? "سنة التخرج" : "Année"} value={d.graduationYear as number} />
            </div>
          ))
        )}
      </Section>

      <Section title={isRTL ? "الخبرة المهنية" : "Expérience professionnelle"}>
        {!ei?.hasExperience ? (
          <p className="text-sm text-slate-400">{isRTL ? "بدون خبرة" : "Aucune expérience"}</p>
        ) : experiences.length === 0 ? (
          <p className="text-sm text-slate-400">—</p>
        ) : (
          experiences.map((e, i) => (
            <div key={i} className="mb-3 last:mb-0">
              <div className="text-xs font-semibold text-slate-400 mb-1">#{i + 1}</div>
              <Row label={isRTL ? "الشركة" : "Entreprise"} value={e.company as string} />
              <Row label={isRTL ? "الخطة" : "Poste"} value={e.position as string} />
              <Row label={isRTL ? "من" : "Début"} value={e.startDate as string} />
              <Row label={isRTL ? "إلى" : "Fin"} value={e.isCurrent ? (isRTL ? "حتى الآن" : "Présent") : (e.endDate as string)} />
              {e.description ? <Row label={isRTL ? "الوصف" : "Description"} value={e.description as string} /> : null}
            </div>
          ))
        )}
      </Section>

      <Section title={isRTL ? "الخطة المطلوبة" : "Poste demandé"}>
        <Row label={isRTL ? "المناظرة: " : "Offre"} value={isRTL ? app.job.titleAr : app.job.titleFr} />
        <Row label={isRTL ? "الرمز" : "Code"} value={app.job.code} />
      </Section>

      {app.documents.length > 0 && (
        <Section title={isRTL ? "الوثائق" : "Documents"}>
          {app.documents.map((d, i) => (
            <div key={i} className="flex justify-between py-2 border-b border-slate-100 last:border-0">
              <span className="text-sm text-slate-800">{d.fileName}</span>
              <span className="text-xs text-slate-400">{d.type} · {(d.fileSize / 1024).toFixed(0)} KB</span>
            </div>
          ))}
        </Section>
      )}

      <div className="mt-6 flex gap-3">
        <button
          onClick={() => window.open(`/api/candidate/applications/${appId}/pdf`, "_blank")}
          className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          {isRTL ? "👁️ معاينة مطلب الترشح" : "👁️ Aperçu de la demande"}
        </button>
        <button
          onClick={async () => {
            const res = await fetch(`/api/candidate/applications/${appId}/pdf`);
            if (!res.ok) return;
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "demande.pdf";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }}
          className="px-5 py-2.5 border rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
        >
          {isRTL ? "📄 تحميل مطلب الترشح" : "📄 Télécharger la demande"}
        </button>
      </div>
    </div>
  );
}
