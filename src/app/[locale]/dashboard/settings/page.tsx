"use client";

import { useState, useEffect, useCallback } from "react";
import { FileDropzone, UploadedFile } from "@/components/file-dropzone";

const GOVERNORATES = [
  "Ariana", "Béja", "Ben Arous", "Bizerte", "Gabès", "Gafsa", "Jendouba", "Kairouan",
  "Kasserine", "Kébili", "Le Kef", "Mahdia", "Manouba", "Medenine", "Monastir", "Nabeul",
  "Sfax", "Sidi Bouzid", "Siliana", "Sousse", "Tataouine", "Tozeur", "Tunis", "Zaghouan",
];

const STUDY_LEVELS = [
  { value: "BAC", label: "Baccalauréat", labelAr: "الباكالوريا" },
  { value: "BAC_PLUS_2", label: "Bac + 2", labelAr: "باك + 2" },
  { value: "LICENCE", label: "Licence", labelAr: "إجازة" },
  { value: "MAITRISE", label: "Maîtrise", labelAr: "ماجستير" },
  { value: "MASTER", label: "Master", labelAr: "ماستر" },
  { value: "DOCTORAT", label: "Doctorat", labelAr: "دكتوراه" },
];

interface Diploma {
  studyLevel: string;
  diploma: string;
  institution: string;
  grade: string;

  graduationYear: number;
}

interface AppInfo {
  id: string;
  status: string;
  personalInfo: Record<string, unknown> | null;
  academicInfo: { diplomas?: Diploma[]; moyenneBac?: string; moyenne1ere?: string; moyenne2eme?: string; moyenne3eme?: string } | null;
  job: { code: string; titleAr: string; titleFr: string };
  createdAt: string;
}

export default function SettingsPage() {
  const [locale, setLocale] = useState("fr");

  useEffect(() => {
    const segments = window.location.pathname.split("/");
    setLocale(segments[1] || "fr");
  }, []);

  const isRTL = locale === "ar";

  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [profile, setProfile] = useState({
    fullName: "",
    email: "",
    phone: "",
    cin: "",
    governorate: "",
    delegation: "",
    smsOptIn: true,
  });
  const [documents, setDocuments] = useState<UploadedFile[]>([]);
  const [applications, setApplications] = useState<AppInfo[]>([]);
  const [editingApp, setEditingApp] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<"personal" | "academic" | null>(null);
  const [appForm, setAppForm] = useState<Record<string, string>>({});
  const [diplomas, setDiplomas] = useState<Diploma[]>([]);
  const [moyenneBac, setMoyenneBac] = useState("");
  const [moyenne1ere, setMoyenne1ere] = useState("");
  const [moyenne2eme, setMoyenne2eme] = useState("");
  const [moyenne3eme, setMoyenne3eme] = useState("");
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [appSaving, setAppSaving] = useState(false);
  const [academicSaving, setAcademicSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState<"profile" | "applications" | "documents" | "password">("profile");

  const fetchProfile = useCallback(async () => {
    try {
      const [profileRes, appsRes] = await Promise.all([
        fetch("/api/candidate/profile"),
        fetch("/api/candidate/applications"),
      ]);
      if (profileRes.ok) {
        const data = await profileRes.json();
        setCandidateId(data.candidate.id || null);
        setProfile({
          fullName: data.candidate.fullName || "",
          email: data.candidate.email || "",
          phone: data.candidate.phone || "",
          cin: data.candidate.cin || "",
          governorate: data.candidate.governorate || "",
          delegation: data.candidate.delegation || "",
          smsOptIn: data.candidate.smsOptIn ?? true,
        });
        if (data.candidate.documents) {
          setDocuments(data.candidate.documents.map((d: { id: string; type: string; fileName: string; fileUrl: string; fileSize: number; mimeType: string }) => ({
            id: d.id,
            type: d.type,
            fileName: d.fileName,
            fileUrl: d.fileUrl,
            fileSize: d.fileSize,
            mimeType: d.mimeType,
          })));
        }
      }
      if (appsRes.ok) {
        const data = await appsRes.json();
        setApplications(data.applications || []);
      }
    } catch {
      setError(isRTL ? "فشل في تحميل البيانات" : "Erreur de chargement des données");
    } finally {
      setLoading(false);
    }
  }, [isRTL]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const res = await fetch("/api/candidate/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: profile.fullName,
          phone: profile.phone,
          governorate: profile.governorate,
          delegation: profile.delegation,
          smsOptIn: profile.smsOptIn,
        }),
      });

      if (res.ok) {
        setSuccess(isRTL ? "تم حفظ التغييرات" : "Modifications enregistrées");
      } else {
        const data = await res.json();
        setError(data.error || (isRTL ? "حدث خطأ" : "Une erreur est survenue"));
      }
    } catch {
      setError(isRTL ? "حدث خطأ" : "Une erreur est survenue");
    } finally {
      setSaving(false);
    }
  };

  const handleAppEditStart = (app: AppInfo, section: "personal" | "academic") => {
    setEditingApp(app.id);
    setEditingSection(section);
    setError("");
    setSuccess("");

    if (section === "personal") {
      const info = (app.personalInfo || {}) as Record<string, unknown>;
      const form: Record<string, string> = {};
      const fields = ["fullName", "firstName", "lastName", "cin", "dateOfBirth", "birthPlace", "gender", "familyStatus", "nationality", "phone", "governorate", "delegation", "address", "postalCode"];
      for (const f of fields) {
        form[f] = String(info[f] || "");
      }
      setAppForm(form);
    } else {
      const ai = app.academicInfo || {};
      setDiplomas(ai.diplomas?.length ? ai.diplomas.map(d => ({ ...d })) : []);
      setMoyenneBac(ai.moyenneBac || "");
      setMoyenne1ere(ai.moyenne1ere || "");
      setMoyenne2eme(ai.moyenne2eme || "");
      setMoyenne3eme(ai.moyenne3eme || "");
    }
  };

  const handleAppSave = async () => {
    if (!editingApp) return;
    setError("");
    setSuccess("");
    setAppSaving(true);
    try {
      const res = await fetch(`/api/applications/${editingApp}/personal-info`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(appForm),
      });
      if (res.ok) {
        setSuccess(isRTL ? "تم تحديث معلومات الملف" : "Informations du dossier mises à jour");
        setEditingApp(null);
        setEditingSection(null);
        fetchProfile();
      } else {
        const data = await res.json();
        setError(data.error || (isRTL ? "حدث خطأ" : "Une erreur est survenue"));
      }
    } catch {
      setError(isRTL ? "حدث خطأ" : "Une erreur est survenue");
    } finally {
      setAppSaving(false);
    }
  };

  const handleAcademicSave = async () => {
    if (!editingApp) return;
    setError("");
    setSuccess("");
    setAcademicSaving(true);
    try {
      const res = await fetch(`/api/applications/${editingApp}/academic-info`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diplomas,
          moyenneBac,
          moyenne1ere,
          moyenne2eme,
          moyenne3eme,
        }),
      });
      if (res.ok) {
        setSuccess(isRTL ? "تم تحديث المسار الأكاديمي" : "Parcours académique mis à jour");
        setEditingApp(null);
        setEditingSection(null);
        fetchProfile();
      } else {
        const data = await res.json();
        setError(data.error || (isRTL ? "حدث خطأ" : "Une erreur est survenue"));
      }
    } catch {
      setError(isRTL ? "حدث خطأ" : "Une erreur est survenue");
    } finally {
      setAcademicSaving(false);
    }
  };

  const addDiploma = () => {
    setDiplomas([...diplomas, { studyLevel: "", diploma: "", institution: "", grade: "", graduationYear: new Date().getFullYear() }]);
  };

  const removeDiploma = (index: number) => {
    if (diplomas.length > 1) {
      setDiplomas(diplomas.filter((_, i) => i !== index));
    }
  };

  const updateDiploma = (index: number, field: string, value: string | number) => {
    setDiplomas(diplomas.map((d, i) => i === index ? { ...d, [field]: value } : d));
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError(isRTL ? "كلمات المرور غير متطابقة" : "Les mots de passe ne correspondent pas");
      return;
    }

    setPasswordSaving(true);

    try {
      const res = await fetch("/api/candidate/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      if (res.ok) {
        setSuccess(isRTL ? "تم تغيير كلمة المرور" : "Mot de passe modifié avec succès");
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        const data = await res.json();
        setError(data.error || (isRTL ? "حدث خطأ" : "Une erreur est survenue"));
      }
    } catch {
      setError(isRTL ? "حدث خطأ" : "Une erreur est survenue");
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">
        {isRTL ? "الإعدادات" : "Paramètres"}
      </h1>

      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={() => setActiveTab("profile")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === "profile" ? "bg-primary text-primary-foreground" : "bg-white border hover:bg-slate-50"
          }`}>
          {isRTL ? "الملف الشخصي" : "Profil"}
        </button>
        <button onClick={() => setActiveTab("applications")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === "applications" ? "bg-primary text-primary-foreground" : "bg-white border hover:bg-slate-50"
          }`}>
          {isRTL ? "طلبات الترشح" : "Candidatures"}
        </button>
        <button onClick={() => setActiveTab("documents")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === "documents" ? "bg-primary text-primary-foreground" : "bg-white border hover:bg-slate-50"
          }`}>
          {isRTL ? "الوثائق" : "Documents"}
        </button>
        <button onClick={() => setActiveTab("password")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === "password" ? "bg-primary text-primary-foreground" : "bg-white border hover:bg-slate-50"
          }`}>
          {isRTL ? "كلمة المرور" : "Mot de passe"}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 text-sm text-destructive bg-destructive/10 rounded-lg">{error}</div>
      )}
      {success && (
        <div className="mb-4 p-3 text-sm text-green-700 bg-green-50 rounded-lg">{success}</div>
      )}

      {activeTab === "profile" && (
        <form onSubmit={handleProfileSave} className="bg-white rounded-xl border p-6 shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{isRTL ? "الاسم الكامل" : "Nom complet"} *</label>
              <input type="text" value={profile.fullName}
                onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{isRTL ? "البريد الإلكتروني" : "Email"}</label>
              <input type="email" value={profile.email} disabled
                className="flex h-10 w-full rounded-md border border-input bg-slate-50 px-3 py-2 text-sm text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{isRTL ? "رقم بطاقة التعريف" : "CIN"}</label>
              <input type="text" value={profile.cin} disabled
                className="flex h-10 w-full rounded-md border border-input bg-slate-50 px-3 py-2 text-sm text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{isRTL ? "رقم الهاتف" : "Téléphone"} *</label>
              <input type="tel" value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="00 000 000"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{isRTL ? "الولاية" : "Gouvernorat"} *</label>
              <select value={profile.governorate}
                onChange={(e) => setProfile({ ...profile, governorate: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required>
                <option value="">{isRTL ? "اختر الولاية" : "Sélectionner"}</option>
                {GOVERNORATES.map((g) => (<option key={g} value={g}>{g}</option>))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{isRTL ? "المعتمدية" : "Délégation"} *</label>
              <input type="text" value={profile.delegation}
                onChange={(e) => setProfile({ ...profile, delegation: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required />
            </div>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={profile.smsOptIn}
                onChange={(e) => setProfile({ ...profile, smsOptIn: e.target.checked })}
                className="rounded border-gray-300 w-5 h-5" />
              <div>
                <span className="font-medium text-sm">{isRTL ? "أوافق على استلام رسائل SMS" : "J'accepte de recevoir des SMS"}</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isRTL ? "سيتم إرسال إشعارات حول حالة طلباتك عبر الرسائل النصية" : "Recevez des notifications sur l'état de vos candidatures par SMS"}
                </p>
              </div>
            </label>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving}
              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50">
              {saving ? (isRTL ? "جار الحفظ..." : "Enregistrement...") : (isRTL ? "حفظ التغييرات" : "Enregistrer")}
            </button>
          </div>
        </form>
      )}

      {activeTab === "applications" && (
        <div className="space-y-4">
          {applications.length === 0 ? (
            <div className="bg-white rounded-xl border p-12 text-center shadow-sm">
              <p className="text-muted-foreground">{isRTL ? "لا توجد طلبات ترشح بعد" : "Aucune candidature pour le moment"}</p>
            </div>
          ) : applications.map((app) => {
            const info = (app.personalInfo || {}) as Record<string, unknown>;
            const ai = app.academicInfo || {};
            const isEditing = editingApp === app.id;
            const editingPersonal = isEditing && editingSection === "personal";
            const editingAcademic = isEditing && editingSection === "academic";

            return (
              <div key={app.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{isRTL ? app.job.titleAr : app.job.titleFr}</h3>
                    <p className="text-xs text-muted-foreground">{app.job.code}</p>
                  </div>
                  {!isEditing && (
                    <div className="flex gap-2">
                      <button onClick={() => handleAppEditStart(app, "personal")}
                        className="px-3 py-1.5 text-sm font-medium border rounded-lg hover:bg-white transition-colors cursor-pointer">
                        {isRTL ? "بيانات شخصية" : "Infos pers."}
                      </button>
                      <button onClick={() => handleAppEditStart(app, "academic")}
                        className="px-3 py-1.5 text-sm font-medium border rounded-lg hover:bg-white transition-colors cursor-pointer">
                        {isRTL ? "المسار الأكاديمي" : "Académique"}
                      </button>
                    </div>
                  )}
                </div>

                {editingPersonal && (
                  <div className="p-4">
                    <h4 className="text-sm font-semibold mb-3">{isRTL ? "البيانات الشخصية" : "Informations personnelles"}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">{isRTL ? "الاسم الكامل" : "Nom complet"}</label>
                        <input type="text" value={appForm.fullName || ""}
                          onChange={(e) => setAppForm({ ...appForm, fullName: e.target.value })}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">{isRTL ? "الاسم الأول" : "Prénom"}</label>
                        <input type="text" value={appForm.firstName || ""}
                          onChange={(e) => setAppForm({ ...appForm, firstName: e.target.value })}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">CIN</label>
                        <input type="text" value={appForm.cin || ""}
                          onChange={(e) => setAppForm({ ...appForm, cin: e.target.value })}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" maxLength={8} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">{isRTL ? "تاريخ الميلاد" : "Date de naissance"}</label>
                        <input type="date" value={appForm.dateOfBirth || ""}
                          onChange={(e) => setAppForm({ ...appForm, dateOfBirth: e.target.value })}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">{isRTL ? "مكان الميلاد" : "Lieu de naissance"}</label>
                        <input type="text" value={appForm.birthPlace || ""}
                          onChange={(e) => setAppForm({ ...appForm, birthPlace: e.target.value })}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">{isRTL ? "الجنس" : "Genre"}</label>
                        <select value={appForm.gender || ""}
                          onChange={(e) => setAppForm({ ...appForm, gender: e.target.value })}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                          <option value="MALE">{isRTL ? "ذكر" : "Masculin"}</option>
                          <option value="FEMALE">{isRTL ? "أنثى" : "Féminin"}</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">{isRTL ? "الحالة العائلية" : "Situation familiale"}</label>
                        <select value={appForm.familyStatus || ""}
                          onChange={(e) => setAppForm({ ...appForm, familyStatus: e.target.value })}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                          <option value="CELIBATAIRE">{isRTL ? "أعزب" : "Célibataire"}</option>
                          <option value="MARIE">{isRTL ? "متزوج" : "Marié(e)"}</option>
                          <option value="DIVORCE">{isRTL ? "مطلق" : "Divorcé(e)"}</option>
                          <option value="VEUF">{isRTL ? "أرمل" : "Veuf/Veuve"}</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">{isRTL ? "الجنسية" : "Nationalité"}</label>
                        <select value={appForm.nationality || ""}
                          onChange={(e) => setAppForm({ ...appForm, nationality: e.target.value })}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                          <option value="Tunisienne">{isRTL ? "تونسية" : "Tunisienne"}</option>
                          <option value="Autre">{isRTL ? "أخرى" : "Autre"}</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">{isRTL ? "رقم الهاتف" : "Téléphone"}</label>
                        <input type="text" value={appForm.phone || ""}
                          onChange={(e) => setAppForm({ ...appForm, phone: e.target.value })}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" maxLength={8} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">{isRTL ? "الولاية" : "Gouvernorat"}</label>
                        <select value={appForm.governorate || ""}
                          onChange={(e) => setAppForm({ ...appForm, governorate: e.target.value })}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                          <option value="">{isRTL ? "اختر الولاية" : "Sélectionner"}</option>
                          {GOVERNORATES.map((g) => (<option key={g} value={g}>{g}</option>))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">{isRTL ? "المعتمدية" : "Délégation"}</label>
                        <input type="text" value={appForm.delegation || ""}
                          onChange={(e) => setAppForm({ ...appForm, delegation: e.target.value })}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-medium">{isRTL ? "العنوان" : "Adresse"}</label>
                        <input type="text" value={appForm.address || ""}
                          onChange={(e) => setAppForm({ ...appForm, address: e.target.value })}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">{isRTL ? "الرمز البريدي" : "Code postal"}</label>
                        <input type="text" value={appForm.postalCode || ""}
                          onChange={(e) => setAppForm({ ...appForm, postalCode: e.target.value })}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleAppSave} disabled={appSaving}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 cursor-pointer">
                        {appSaving ? (isRTL ? "جار الحفظ..." : "Enregistrement...") : (isRTL ? "حفظ" : "Enregistrer")}
                      </button>
                      <button onClick={() => { setEditingApp(null); setEditingSection(null); }} disabled={appSaving}
                        className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-50 cursor-pointer">
                        {isRTL ? "إلغاء" : "Annuler"}
                      </button>
                    </div>
                  </div>
                )}

                {editingAcademic && (
                  <div className="p-4">
                    <h4 className="text-sm font-semibold mb-3">{isRTL ? "المسار الأكاديمي" : "Parcours académique"}</h4>

                    <div className="space-y-4 mb-4">
                      {diplomas.map((d, index) => (
                        <div key={index} className="border rounded-lg p-4 space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">{isRTL ? `الشهادة ${index + 1}` : `Diplôme ${index + 1}`}</span>
                            {diplomas.length > 1 && (
                              <button onClick={() => removeDiploma(index)}
                                className="text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded">
                                {isRTL ? "حذف" : "Supprimer"}
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-xs font-medium">{isRTL ? "المستوى الدراسي" : "Niveau d'étude"}</label>
                              <select value={d.studyLevel}
                                onChange={(e) => updateDiploma(index, "studyLevel", e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                                <option value="">{isRTL ? "اختر المستوى" : "Sélectionner"}</option>
                                {STUDY_LEVELS.map((l) => (<option key={l.value} value={l.value}>{isRTL ? l.labelAr : l.label}</option>))}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-medium">{isRTL ? "اسم الشهادة" : "Diplôme"}</label>
                              <input type="text" value={d.diploma}
                                onChange={(e) => updateDiploma(index, "diploma", e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-medium">{isRTL ? "المؤسسة" : "Institution"}</label>
                              <input type="text" value={d.institution}
                                onChange={(e) => updateDiploma(index, "institution", e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-medium">{isRTL ? "التقدير" : "Mention"}</label>
                              <input type="text" value={d.grade}
                                onChange={(e) => updateDiploma(index, "grade", e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm" />
                            </div>

                            <div className="space-y-1">
                              <label className="text-xs font-medium">{isRTL ? "سنة التخرج" : "Année d'obtention"}</label>
                              <input type="number" value={d.graduationYear}
                                onChange={(e) => updateDiploma(index, "graduationYear", parseInt(e.target.value))}
                                min={1960} max={new Date().getFullYear()}
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm" />
                            </div>
                          </div>
                        </div>
                      ))}
                      <button onClick={addDiploma}
                        className="w-full py-2 border-2 border-dashed rounded-lg text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer">
                        + {isRTL ? "إضافة شهادة" : "Ajouter un diplôme"}
                      </button>
                    </div>

                    <div className="border-t pt-4">
                      <h5 className="text-sm font-medium mb-3">{isRTL ? "المعدلات" : "Moyennes"}</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-medium">{isRTL ? "معدل الباكالوريا" : "Moyenne Bac"}</label>
                          <input type="text" value={moyenneBac}
                            onChange={(e) => setMoyenneBac(e.target.value)}
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium">{isRTL ? "معدل السنة الأولى" : "Moyenne 1ère"}</label>
                          <input type="text" value={moyenne1ere}
                            onChange={(e) => setMoyenne1ere(e.target.value)}
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium">{isRTL ? "معدل السنة الثانية" : "Moyenne 2ème"}</label>
                          <input type="text" value={moyenne2eme}
                            onChange={(e) => setMoyenne2eme(e.target.value)}
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium">{isRTL ? "معدل السنة الثالثة" : "Moyenne 3ème"}</label>
                          <input type="text" value={moyenne3eme}
                            onChange={(e) => setMoyenne3eme(e.target.value)}
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm" />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <button onClick={handleAcademicSave} disabled={academicSaving}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 cursor-pointer">
                        {academicSaving ? (isRTL ? "جار الحفظ..." : "Enregistrement...") : (isRTL ? "حفظ" : "Enregistrer")}
                      </button>
                      <button onClick={() => { setEditingApp(null); setEditingSection(null); }} disabled={academicSaving}
                        className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-50 cursor-pointer">
                        {isRTL ? "إلغاء" : "Annuler"}
                      </button>
                    </div>
                  </div>
                )}

                {!isEditing && (
                  <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    {!!info.fullName && <div><span className="text-muted-foreground">{isRTL ? "الاسم:" : "Nom:"}</span> <span className="font-medium">{String(info.fullName)}</span></div>}
                    {!!info.cin && <div><span className="text-muted-foreground">CIN:</span> <span className="font-medium">{String(info.cin)}</span></div>}
                    {!!info.phone && <div><span className="text-muted-foreground">{isRTL ? "الهاتف:" : "Tél.:"}</span> <span className="font-medium">{String(info.phone)}</span></div>}
                    {!!info.governorate && <div><span className="text-muted-foreground">{isRTL ? "الولاية:" : "Gouv.:"}</span> <span className="font-medium">{String(info.governorate)}</span></div>}
                    {!!info.delegation && <div><span className="text-muted-foreground">{isRTL ? "المعتمدية:" : "Délég.:"}</span> <span className="font-medium">{String(info.delegation)}</span></div>}
                    {ai.moyenneBac && <div><span className="text-muted-foreground">{isRTL ? "م. الباك:" : "Moy. Bac:"}</span> <span className="font-medium">{ai.moyenneBac}</span></div>}
                    {ai.diplomas?.length ? <div><span className="text-muted-foreground">{isRTL ? "الشهادات:" : "Diplômes:"}</span> <span className="font-medium">{ai.diplomas.length}</span></div> : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {activeTab === "documents" && (
        <div className="bg-white rounded-xl border p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-1">{isRTL ? "ملف الترشح" : "Dossier de candidature"}</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {isRTL ? "قم بتحميل الوثائق المطلوبة لدعم ملف ترشحك (PDF, JPG, PNG - الحد الأقصى 5 ميغابايت)" : "Téléchargez les documents requis pour votre dossier de candidature (PDF, JPG, PNG - max 5 Mo)"}
            </p>
            <FileDropzone candidateId={candidateId} docType="candidate_document" value={documents} onChange={setDocuments}
              locale={isRTL ? "ar" : "fr"} multiple
              label={{ ar: "انقر أو اسحب الملفات هنا لإضافتها إلى ملف ترشحك", fr: "Cliquez ou glissez les fichiers ici pour les ajouter à votre dossier" }}
              hint={{ ar: "PDF, JPG, PNG - كل ملف بحد أقصى 5 ميغابايت", fr: "PDF, JPG, PNG - chaque fichier jusqu'à 5 Mo" }} />
          </div>
        </div>
      )}

      {activeTab === "password" && (
        <form onSubmit={handlePasswordChange} className="bg-white rounded-xl border p-6 shadow-sm space-y-4 max-w-md">
          <div className="space-y-2">
            <label className="text-sm font-medium">{isRTL ? "كلمة المرور الحالية" : "Mot de passe actuel"} *</label>
            <input type="password" value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{isRTL ? "كلمة المرور الجديدة" : "Nouveau mot de passe"} *</label>
            <input type="password" value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required minLength={8} />
            <p className="text-xs text-muted-foreground">
              {isRTL ? "يجب أن تحتوي على 8 أحرف على الأقل، حرف كبير، حرف صغير، ورقم" : "Minimum 8 caractères, une majuscule, une minuscule et un chiffre"}
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{isRTL ? "تأكيد كلمة المرور" : "Confirmer le mot de passe"} *</label>
            <input type="password" value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required />
          </div>
          <button type="submit" disabled={passwordSaving}
            className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50">
            {passwordSaving ? (isRTL ? "جار التغيير..." : "Modification...") : (isRTL ? "تغيير كلمة المرور" : "Changer le mot de passe")}
          </button>
        </form>
      )}
    </div>
  );
}
