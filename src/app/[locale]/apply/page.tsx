"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { signIn, signOut, getSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { formatPhone } from "@/lib/phone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { FileDropzone, UploadedFile } from "@/components/file-dropzone";
import { useApplication } from "@/context/application-context";

const GOVERNORATES = [
  "Ariana", "Béja", "Ben Arous", "Bizerte", "Gabès", "Gafsa", "Jendouba", "Kairouan",
  "Kasserine", "Kébili", "Le Kef", "Mahdia", "Manouba", "Medenine", "Monastir", "Nabeul",
  "Sfax", "Sidi Bouzid", "Siliana", "Sousse", "Tataouine", "Tozeur", "Tunis", "Zaghouan",
];

const STUDY_LEVELS = [
  { value: "BAC", label: "Baccalauréat" },
  { value: "BAC_PLUS_2", label: "Bac + 2 (DEUG)" },
  { value: "LICENCE", label: "Licence (Bac + 3)" },
  { value: "MAITRISE", label: "Maîtrise (Bac + 4)" },
  { value: "MASTER", label: "Master (Bac + 5)" },
  { value: "DOCTORAT", label: "Doctorat" },
];

const FAMILY_STATUSES = [
  { value: "CELIBATAIRE", labelFr: "Célibataire", labelAr: "أعزب" },
  { value: "MARIE", labelFr: "Marié(e)", labelAr: "متزوج" },
  { value: "DIVORCE", labelFr: "Divorcé(e)", labelAr: "مطلق" },
  { value: "VEUF", labelFr: "Veuf(ve)", labelAr: "أرمل" },
];

const STEPS = [
  { num: 1, labelFr: "Informations personnelles", labelAr: "المعلومات الشخصية" },
  { num: 2, labelFr: "Parcours académique", labelAr: "المسار الأكاديمي" },
  { num: 3, labelFr: "Expérience professionnelle", labelAr: "الخبرة المهنية" },
  { num: 4, labelFr: "Pièces justificatives", labelAr: "الوثائق المطلوبة" },
  { num: 5, labelFr: "Choix du poste", labelAr: "اختيار الوظيفة" },
  { num: 6, labelFr: "Validation", labelAr: "التأكيد" },
];

interface Diploma {
  studyLevel: string;
  diploma: string;
  institution: string;
  grade: string;
  graduationYear: number;
}

interface Experience {
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  description: string;
}

interface SavedExperience {
  company: string;
  position: string;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  description: string;
}

export default function ApplicationWizard() {
  const t = useTranslations("candidate");
  const params = useParams();
  const locale = (params.locale as string) || "fr";
  const router = useRouter();
  const isRTL = locale === "ar";

  const {
    currentStep,
    setCurrentStep,
    formData,
    updateFormData,
    lastSaved,
    setLastSaved,
  } = useApplication();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [successAppId, setSuccessAppId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Array<{ id: string; code: string; titleFr: string; titleAr: string; deadline: string }>>([]);

  const [accountData, setAccountData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    termsAccepted: false,
  });

  const [personalData, setPersonalData] = useState({
    lastName: formData.personalInfo?.lastName || "",
    firstName: formData.personalInfo?.firstName || "",
    cin: formData.personalInfo?.cin || "",
    dateOfBirth: formData.personalInfo?.dateOfBirth || "",
    birthPlace: formData.personalInfo?.birthPlace || "",
    gender: (formData.personalInfo?.gender || "MALE") as "MALE" | "FEMALE",
    familyStatus: formData.personalInfo?.familyStatus || "",
    numberOfChildren: formData.personalInfo?.numberOfChildren ?? 0,
    phone: formData.personalInfo?.phone || "",
    governorate: formData.personalInfo?.governorate || "",
    delegation: formData.personalInfo?.delegation || "",
    smsOptIn: formData.personalInfo?.smsOptIn ?? true,
  });

  const [diplomas, setDiplomas] = useState<Diploma[]>(
    formData.academicInfo?.diplomas?.length
      ? formData.academicInfo.diplomas
      : [{ studyLevel: "", diploma: "", institution: "", grade: "", graduationYear: new Date().getFullYear() }]
  );

  const [hasExperience, setHasExperience] = useState(formData.experienceInfo?.hasExperience ?? false);
  const [experiences, setExperiences] = useState<Experience[]>(
    (formData.experienceInfo?.experiences as SavedExperience[] | undefined)?.map(exp => ({
      ...exp,
      endDate: exp.endDate || "",
    })) || []
  );

  const [selectedJob, setSelectedJob] = useState(formData.jobSelection?.jobId || "");

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>(
    (formData.documents?.files as UploadedFile[] | undefined) || []
  );

  const [termsAccepted, setTermsAccepted] = useState(formData.termsAccepted || false);
  const [certificationSigned, setCertificationSigned] = useState(formData.certificationSigned || false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedStep = localStorage.getItem("application_current_step");
      if (savedStep) {
        setCurrentStep(parseInt(savedStep));
      }
    }
  }, [setCurrentStep]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("application_current_step", String(currentStep));
    }
  }, [currentStep]);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await fetch("/api/jobs?status=PUBLISHED");
        if (res.ok) {
          const data = await res.json();
          setJobs(data);
        }
      } catch {
        console.error("Failed to fetch jobs");
      }
    };
    fetchJobs();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const jobId = new URLSearchParams(window.location.search).get("jobId");
    if (jobId) {
      setSelectedJob(jobId);
      updateFormData("jobSelection", { jobId });
    }
  }, [updateFormData]);

  const handleAutoSave = useCallback(() => {
    setLastSaved(new Date());
  }, [setLastSaved]);

  useEffect(() => {
    const interval = setInterval(() => {
      handleAutoSave();
    }, 30000);
    return () => clearInterval(interval);
  }, [handleAutoSave]);

  const validateLocalStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return (
          !!accountData.email &&
          !!accountData.password &&
          accountData.password.length >= 8 &&
          accountData.password === accountData.confirmPassword &&
          accountData.termsAccepted &&
          !!personalData.lastName &&
          !!personalData.firstName &&
          !!personalData.cin &&
          personalData.cin.length === 8 &&
          !!personalData.phone &&
          !!personalData.governorate &&
          !!personalData.delegation &&
          !!personalData.dateOfBirth &&
          !!personalData.birthPlace &&
          !!personalData.familyStatus
        );
      case 2:
        return diplomas.some(
          (d) => d.studyLevel && d.diploma && d.institution && d.grade
        );
      case 3:
        if (!hasExperience) return true;
        return experiences.some((e) => e.company && e.position && e.startDate);
      case 4:
        return true;
      case 5:
        return !!selectedJob;
      case 6:
        return termsAccepted && certificationSigned;
      default:
        return true;
    }
  };

  const syncStepToContext = (step: number) => {
    if (step === 1) {
      updateFormData("accountInfo", accountData);
      updateFormData("personalInfo", personalData);
    } else if (step === 2) updateFormData("academicInfo", { diplomas });
    else if (step === 3) updateFormData("experienceInfo", { hasExperience, experiences });
    else if (step === 4) updateFormData("documents", { files: uploadedFiles });
    else if (step === 5) updateFormData("jobSelection", { jobId: selectedJob });
  };

  const ensureCandidateSession = async (): Promise<string | null> => {
    const existing = await getSession();
    if (existing?.user?.role === "CANDIDATE") {
      try {
        const verifyRes = await fetch("/api/candidate/profile");
        if (verifyRes.ok) {
          return existing.user.id;
        }
      } catch {
        // Candidate not found, proceed to re-register
      }
      await signOut({ redirect: false });
    }

    const registrationPayload = {
      email: accountData.email,
      password: accountData.password,
      confirmPassword: accountData.confirmPassword,
      fullName: `${personalData.firstName} ${personalData.lastName}`,
      cin: personalData.cin,
      dateOfBirth: personalData.dateOfBirth,
      gender: personalData.gender,
      phone: formatPhone(personalData.phone),
      governorate: personalData.governorate,
      delegation: personalData.delegation,
      smsOptIn: personalData.smsOptIn,
    };

    const registerRes = await fetch(`/api/auth/register?locale=${locale}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(registrationPayload),
    });

    if (!registerRes.ok) {
      const data = await registerRes.json();
      const errText = typeof data.error === "string" ? data.error : "";
      const isDuplicate =
        errText.toLowerCase().includes("email") ||
        errText.toLowerCase().includes("déjà") ||
        errText.includes("مسجل");

      if (!isDuplicate) {
        setError(errText || (isRTL ? "فشل إنشاء الحساب" : "Échec de la création du compte"));
        return null;
      }
    }

    const signInResult = await signIn("credentials", {
      email: accountData.email,
      password: accountData.password,
      userType: "candidate",
      redirect: false,
    });

    if (signInResult?.error) {
      setError(
        isRTL
          ? "فشل تسجيل الدخول. تحقق من البريد وكلمة المرور."
          : "Échec de connexion. Vérifiez votre email et mot de passe."
      );
      return null;
    }

    for (let attempt = 0; attempt < 5; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const session = await getSession();
      if (session?.user?.role === "CANDIDATE") {
        return session.user.id;
      }
    }

    setError(isRTL ? "فشل تسجيل الدخول" : "Échec de connexion");
    return null;
  };

  const handleNext = () => {
    setError("");

    if (!validateLocalStep(currentStep)) {
      setError(
        isRTL
          ? "يرجى إكمال جميع الحقول المطلوبة"
          : "Veuillez remplir tous les champs obligatoires"
      );
      return;
    }

    syncStepToContext(currentStep);
    setCurrentStep(Math.min(currentStep + 1, 6));
  };

  const handleBack = () => {
    setError("");
    setCurrentStep(Math.max(currentStep - 1, 1));
  };

  const addDiploma = () => {
    const updated = [...diplomas, { studyLevel: "", diploma: "", institution: "", grade: "", graduationYear: new Date().getFullYear() }];
    setDiplomas(updated);
  };

  const removeDiploma = (index: number) => {
    if (diplomas.length > 1) {
      setDiplomas(diplomas.filter((_, i) => i !== index));
    }
  };

  const updateDiploma = (index: number, field: string, value: string | number) => {
    setDiplomas(diplomas.map((d, i) => i === index ? { ...d, [field]: value } : d));
  };

  const addExperience = () => {
    setExperiences([...experiences, { company: "", position: "", startDate: "", endDate: "", isCurrent: false, description: "" }]);
  };

  const removeExperience = (index: number) => {
    setExperiences(experiences.filter((_, i) => i !== index));
  };

  const updateExperience = (index: number, field: string, value: string | boolean) => {
    setExperiences(experiences.map((exp, i) => i === index ? { ...exp, [field]: value } : exp));
  };

  const handleFilesChange = useCallback((next: UploadedFile[]) => {
    setUploadedFiles(next);
    updateFormData("documents", { files: next });
  }, [updateFormData]);

  const handleSubmit = async () => {
    setError("");

    if (!validateLocalStep(6)) {
      setError(isRTL ? "يرجى قبول الشروط والتأكيد" : "Veuillez accepter les conditions et confirmer");
      return;
    }

    if (!selectedJob) {
      setError(isRTL ? "يرجى اختيار وظيفة" : "Veuillez sélectionner un emploi");
      return;
    }

    setLoading(true);

    updateFormData("termsAccepted", termsAccepted);
    updateFormData("certificationSigned", certificationSigned);
    syncStepToContext(1);
    syncStepToContext(2);
    syncStepToContext(3);
    syncStepToContext(4);
    syncStepToContext(5);

    const submissionData = {
      personalInfo: {
        lastName: personalData.lastName,
        firstName: personalData.firstName,
        fullName: `${personalData.firstName} ${personalData.lastName}`,
        cin: personalData.cin,
        dateOfBirth: personalData.dateOfBirth,
        birthPlace: personalData.birthPlace,
        gender: personalData.gender,
        familyStatus: personalData.familyStatus,
        numberOfChildren: personalData.numberOfChildren,
        phone: formatPhone(personalData.phone),
        governorate: personalData.governorate,
        delegation: personalData.delegation,
        email: accountData.email,
      },
      academicInfo: { diplomas },
      experienceInfo: { hasExperience, experiences },
      jobSelection: { jobId: selectedJob },
      documents: { files: uploadedFiles },
      termsAccepted,
      certificationSigned,
    };

    try {
      const candidateId = await ensureCandidateSession();
      if (!candidateId) {
        setLoading(false);
        return;
      }

      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(submissionData),
      });

      if (res.ok) {
        const appData = await res.json();
        setSuccessAppId(appData.id);
        setSuccess(true);
        if (typeof window !== "undefined") {
          localStorage.removeItem("application_current_step");
        }
      } else {
        const data = await res.json();
        setError(data.error || (isRTL ? "حدث خطأ" : "Une erreur est survenue"));
      }
    } catch {
      setError(isRTL ? "حدث خطأ" : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  // ---------- Step Renderers ----------

  const renderStep1 = () => (
    <div className="space-y-8">
      {/* Account Section */}
      <div>
        <h3 className="text-sm font-semibold text-slate-800 mb-4">
          {isRTL ? "معلومات الحساب" : "Informations du compte"}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm">
              {t("email")} <span className="text-red-500">*</span>
            </Label>
            <Input id="email" type="email" value={accountData.email}
              onChange={(e) => setAccountData({ ...accountData, email: e.target.value })} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm">
              {isRTL ? "كلمة المرور" : "Mot de passe"} <span className="text-red-500">*</span>
            </Label>
            <Input id="password" type="password" value={accountData.password}
              onChange={(e) => setAccountData({ ...accountData, password: e.target.value })} required minLength={8} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="text-sm">
              {isRTL ? "تأكيد كلمة المرور" : "Confirmer le mot de passe"} <span className="text-red-500">*</span>
            </Label>
            <Input id="confirmPassword" type="password" value={accountData.confirmPassword}
              onChange={(e) => setAccountData({ ...accountData, confirmPassword: e.target.value })} required />
          </div>
        </div>
      </div>

      {/* Personal Info Section */}
      <div>
        <h3 className="text-sm font-semibold text-slate-800 mb-4">
          {isRTL ? "المعلومات الشخصية" : "Informations personnelles"}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="lastName" className="text-sm">
              {isRTL ? "النسب" : "Nom"} <span className="text-red-500">*</span>
            </Label>
            <Input id="lastName" value={personalData.lastName}
              onChange={(e) => setPersonalData({ ...personalData, lastName: e.target.value })} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="firstName" className="text-sm">
              {isRTL ? "الاسم" : "Prénom"} <span className="text-red-500">*</span>
            </Label>
            <Input id="firstName" value={personalData.firstName}
              onChange={(e) => setPersonalData({ ...personalData, firstName: e.target.value })} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cin" className="text-sm">
              {t("cin")} <span className="text-red-500">*</span>
            </Label>
            <Input id="cin" value={personalData.cin}
              onChange={(e) => setPersonalData({ ...personalData, cin: e.target.value })}
              placeholder="12345678" required maxLength={8} pattern="[0-9]{8}" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dateOfBirth" className="text-sm">
              {t("dateOfBirth")} <span className="text-red-500">*</span>
            </Label>
            <Input id="dateOfBirth" type="date" value={personalData.dateOfBirth}
              onChange={(e) => setPersonalData({ ...personalData, dateOfBirth: e.target.value })} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="birthPlace" className="text-sm">
              {isRTL ? "مكان الولادة" : "Lieu de naissance"} <span className="text-red-500">*</span>
            </Label>
            <Input id="birthPlace" value={personalData.birthPlace}
              onChange={(e) => setPersonalData({ ...personalData, birthPlace: e.target.value })} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gender" className="text-sm">
              {isRTL ? "الجنس" : "Genre"} <span className="text-red-500">*</span>
            </Label>
            <select id="gender" value={personalData.gender}
              onChange={(e) => setPersonalData({ ...personalData, gender: e.target.value as "MALE" | "FEMALE" })}
              className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="MALE">{isRTL ? "ذكر" : "Homme"}</option>
              <option value="FEMALE">{isRTL ? "أنثى" : "Femme"}</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="familyStatus" className="text-sm">
              {isRTL ? "الوضع العائلي" : "Situation familiale"} <span className="text-red-500">*</span>
            </Label>
            <select id="familyStatus" value={personalData.familyStatus}
              onChange={(e) => setPersonalData({ ...personalData, familyStatus: e.target.value })}
              className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">{isRTL ? "اختر" : "Sélectionner"}</option>
              {FAMILY_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{isRTL ? s.labelAr : s.labelFr}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="numberOfChildren" className="text-sm">
              {isRTL ? "عدد الأطفال" : "Nombre d'enfants"}
            </Label>
            <Input id="numberOfChildren" type="number" min={0} value={personalData.numberOfChildren}
              onChange={(e) => setPersonalData({ ...personalData, numberOfChildren: parseInt(e.target.value) || 0 })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone" className="text-sm">
              {t("phone")} <span className="text-red-500">*</span>
            </Label>
            <Input id="phone" value={personalData.phone}
              onChange={(e) => setPersonalData({ ...personalData, phone: e.target.value })}
              placeholder="00 000 000" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="governorate" className="text-sm">
              {t("governorate")} <span className="text-red-500">*</span>
            </Label>
            <select id="governorate" value={personalData.governorate}
              onChange={(e) => setPersonalData({ ...personalData, governorate: e.target.value })}
              className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">{isRTL ? "اختر الولاية" : "Sélectionner"}</option>
              {GOVERNORATES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="delegation" className="text-sm">
              {t("delegation")} <span className="text-red-500">*</span>
            </Label>
            <Input id="delegation" value={personalData.delegation}
              onChange={(e) => setPersonalData({ ...personalData, delegation: e.target.value })} required />
          </div>
        </div>
      </div>

      {/* SMS Opt-in */}
      <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
        <input type="checkbox" id="smsOptIn" checked={personalData.smsOptIn}
          onChange={(e) => setPersonalData({ ...personalData, smsOptIn: e.target.checked })}
          className="w-4 h-4 rounded border-slate-300" />
        <Label htmlFor="smsOptIn" className="text-sm font-normal cursor-pointer">
          {isRTL ? "أوافق على استلام رسائل SMS" : "J'accepte de recevoir des SMS"}
        </Label>
      </div>

      {/* Terms */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-start gap-3">
          <input type="checkbox" id="termsAccepted" checked={accountData.termsAccepted}
            onChange={(e) => setAccountData({ ...accountData, termsAccepted: e.target.checked })}
            className="mt-1 w-4 h-4 rounded border-amber-300" />
          <div>
            <Label htmlFor="termsAccepted" className="text-sm font-medium text-amber-800 cursor-pointer">
              {t("termsAgree")}
            </Label>
            <p className="text-xs text-amber-700 mt-1">
              {isRTL
                ? "بالنقر على هذا المربع، أوافق على الشروط والأحكام"
                : "En cochant cette case, j'accepte les conditions générales"}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">{error}</div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      {diplomas.map((diploma, index) => (
        <Card key={index}>
          <CardContent className="p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-semibold text-slate-800">
                {isRTL ? `الشهادة ${index + 1}` : `Diplôme ${index + 1}`}
              </h4>
              {diplomas.length > 1 && (
                <Button type="button" variant="ghost" size="sm" onClick={() => removeDiploma(index)}
                  className="text-red-500 hover:text-red-700">
                  {isRTL ? "حذف" : "Supprimer"}
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm">{t("studyLevel")} <span className="text-red-500">*</span></Label>
                <select value={diploma.studyLevel}
                  onChange={(e) => updateDiploma(index, "studyLevel", e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">{isRTL ? "اختر المستوى" : "Sélectionner"}</option>
                  {STUDY_LEVELS.map((level) => (
                    <option key={level.value} value={level.value}>{level.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">{t("diploma")} <span className="text-red-500">*</span></Label>
                <Input value={diploma.diploma}
                  onChange={(e) => updateDiploma(index, "diploma", e.target.value)}
                  placeholder={isRTL ? "مثال: إجازة في العلوم" : "Ex: Licence en Sciences"} required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">{t("institution")} <span className="text-red-500">*</span></Label>
                <Input value={diploma.institution}
                  onChange={(e) => updateDiploma(index, "institution", e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">{t("grade")} <span className="text-red-500">*</span></Label>
                <Input value={diploma.grade}
                  onChange={(e) => updateDiploma(index, "grade", e.target.value)}
                  placeholder={isRTL ? "مثال: جيد جداً" : "Ex: Très bien"} required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">{t("graduationYear")} <span className="text-red-500">*</span></Label>
                <Input type="number" value={diploma.graduationYear}
                  onChange={(e) => updateDiploma(index, "graduationYear", parseInt(e.target.value))}
                  min={1960} max={new Date().getFullYear()} required />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      <Button type="button" variant="outline" onClick={addDiploma} className="w-full border-dashed">
        + {isRTL ? "إضافة شهادة أخرى" : "Ajouter un autre diplôme"}
      </Button>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="p-4 bg-slate-50 rounded-lg">
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={hasExperience}
            onChange={(e) => { setHasExperience(e.target.checked); if (!e.target.checked) setExperiences([]); }}
            className="w-4 h-4 rounded border-slate-300" />
          <span className="text-sm font-medium">{t("hasExperience")}</span>
        </label>
      </div>
      {hasExperience && (
        <>
          {experiences.map((exp, index) => (
            <Card key={index}>
              <CardContent className="p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-semibold text-slate-800">
                    {isRTL ? `الخبرة ${index + 1}` : `Expérience ${index + 1}`}
                  </h4>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeExperience(index)}
                    className="text-red-500 hover:text-red-700">
                    {isRTL ? "حذف" : "Supprimer"}
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm">{t("company")} <span className="text-red-500">*</span></Label>
                    <Input value={exp.company} onChange={(e) => updateExperience(index, "company", e.target.value)} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">{t("position")} <span className="text-red-500">*</span></Label>
                    <Input value={exp.position} onChange={(e) => updateExperience(index, "position", e.target.value)} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">{t("startDate")} <span className="text-red-500">*</span></Label>
                    <Input type="date" value={exp.startDate} onChange={(e) => updateExperience(index, "startDate", e.target.value)} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">{t("endDate")}</Label>
                    <Input type="date" value={exp.endDate} onChange={(e) => updateExperience(index, "endDate", e.target.value)} disabled={exp.isCurrent} />
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={exp.isCurrent}
                    onChange={(e) => updateExperience(index, "isCurrent", e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300" />
                  <span className="text-sm">{t("currentJob")}</span>
                </label>
                <div className="space-y-1.5">
                  <Label className="text-sm">{isRTL ? "الوصف" : "Description"}</Label>
                  <textarea value={exp.description}
                    onChange={(e) => updateExperience(index, "description", e.target.value)}
                    className="flex min-h-[80px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" rows={3} />
                </div>
              </CardContent>
            </Card>
          ))}
          <Button type="button" variant="outline" onClick={addExperience} className="w-full border-dashed">
            + {isRTL ? "إضافة خبرة أخرى" : "Ajouter une autre expérience"}
          </Button>
        </>
      )}
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <FileDropzone
        value={uploadedFiles}
        onChange={handleFilesChange}
        locale={isRTL ? "ar" : "fr"}
        docType="application_document"
      />

      {uploadedFiles.length === 0 && (
        <div className="p-3 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg">
          {isRTL
            ? "أرفق المستندات المطلوبة (CIN، الدبلوم، السيرة الذاتية، إلخ)."
            : "Joignez les documents requis (CIN, diplôme, CV, etc.)."}
        </div>
      )}
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6">
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex items-start gap-2">
        <svg className="w-5 h-5 mt-0.5 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <span>
          {isRTL
            ? "يرجى اختيار الوظيفة التي ترغب في التقديم عليها. يمكنك اختيار وظيفة واحدة فقط."
            : "Veuillez sélectionner le poste auquel vous souhaitez postuler. Vous ne pouvez choisir qu'un seul poste."}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {jobs.length === 0 ? (
          <p className="col-span-2 text-center text-slate-500 py-8">
            {isRTL ? "لا توجد وظائف متاحة حالياً" : "Aucune offre disponible actuellement"}
          </p>
        ) : (
          jobs.map((job) => (
            <Card key={job.id}
              className={`cursor-pointer transition-all duration-200 ${
                selectedJob === job.id
                  ? "ring-2 ring-blue-500 border-blue-500 shadow-md"
                  : "hover:border-blue-300 hover:shadow-sm"
              }`}
              onClick={() => setSelectedJob(job.id)}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-sm">{isRTL ? job.titleAr : job.titleFr}</h3>
                    <p className="text-xs text-slate-500">{job.code}</p>
                  </div>
                  {selectedJob === job.id && (
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {isRTL ? "آخر أجل: " : "Date limite: "}
                  {new Date(job.deadline).toLocaleDateString(locale === "ar" ? "ar-TN" : "fr-FR")}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );

  const renderStep6 = () => (
    <div className="space-y-6">
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
        <svg className="w-5 h-5 mt-0.5 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <div>
          <p className="text-sm font-medium text-amber-800">
            {isRTL ? "يرجى التحقق من صحة المعلومات قبل الإرسال" : "Veuillez vérifier vos informations avant de soumettre"}
          </p>
          <p className="text-xs text-amber-700 mt-1">
            {isRTL
              ? "بعد إرسال طلبك، لن تتمكن من تعديل المعلومات."
              : "Une fois votre candidature soumise, vous ne pourrez plus modifier les informations."}
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-5 space-y-3">
          <h4 className="text-sm font-semibold">{isRTL ? "ملخص الطلب" : "Résumé de la candidature"}</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-slate-500">{isRTL ? "الاسم" : "Nom"}:</span> {personalData.lastName}</div>
            <div><span className="text-slate-500">{isRTL ? "الاسم الأول" : "Prénom"}:</span> {personalData.firstName}</div>
            <div><span className="text-slate-500">{t("cin")}:</span> {personalData.cin}</div>
            <div><span className="text-slate-500">{t("phone")}:</span> {personalData.phone}</div>
            <div><span className="text-slate-500">{t("governorate")}:</span> {personalData.governorate}</div>
          </div>
          {diplomas.filter(d => d.diploma).length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs text-slate-500 mb-1">{isRTL ? "الشهادات" : "Diplômes"}:</p>
              {diplomas.filter(d => d.diploma).map((d, i) => (
                <p key={i} className="text-sm">{d.diploma} - {d.institution}</p>
              ))}
            </div>
          )}
          {selectedJob && (
            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs text-slate-500 mb-1">{isRTL ? "الوظيفة المختارة" : "Poste choisi"}:</p>
              <p className="text-sm font-medium">
                {isRTL
                  ? jobs.find(j => j.id === selectedJob)?.titleAr
                  : jobs.find(j => j.id === selectedJob)?.titleFr}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="mt-1 w-4 h-4 rounded border-blue-300" />
          <div>
            <span className="text-sm font-medium text-blue-900">{t("termsAgree")}</span>
            <p className="text-xs text-blue-700 mt-1">
              {isRTL
                ? "أقر بأنني اطلعت على الشروط والأحكام وأوافق عليها"
                : "Je certifie avoir lu et accepté les conditions générales"}
            </p>
          </div>
        </label>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={certificationSigned}
            onChange={(e) => setCertificationSigned(e.target.checked)}
            className="mt-1 w-4 h-4 rounded border-blue-300" />
          <div>
            <span className="text-sm font-medium text-blue-900">{t("certifyAccuracy")}</span>
            <p className="text-xs text-blue-700 mt-1">
              {isRTL
                ? "أقر بأن جميع المعلومات المقدمة صحيحة وأتحمل كامل المسؤولية"
                : "Je certifie que toutes les informations fournies sont exactes et j'en assume l'entière responsabilité"}
            </p>
          </div>
        </label>
      </div>

      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">{error}</div>
      )}
    </div>
  );

  const renderConfirmation = () => (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
        <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold mb-2 text-center">{t("applicationSubmitted")}</h2>
      <p className="text-slate-500 text-center max-w-md mb-8">
        {isRTL
          ? "تم إرسال طلبك بنجاح. ستتلقى رسالة تأكيد على بريدك الإلكتروني."
          : "Votre candidature a été soumise avec succès. Vous recevrez un email de confirmation."}
      </p>
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 flex items-start gap-2 max-w-md">
        <svg className="w-5 h-5 mt-0.5 shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>
          {isRTL
            ? "سيتم مراجعة طلبك من قبل فريقنا. يمكنك متابعة حالة طلبك من لوحة التحكم."
            : "Votre candidature sera examinée par notre équipe. Vous pouvez suivre son statut depuis votre espace."}
        </span>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 mt-6">
        <Button onClick={() => {
          const link = document.createElement("a");
          link.href = `/api/applications/${successAppId}/convocation`;
          link.target = "_blank";
          link.click();
        }}>
          {isRTL ? "📄 تحميل استدعاء الترشح" : "📄 Télécharger la convocation"}
        </Button>
        <Button variant="outline" onClick={() => router.push(`/${locale}/dashboard`)}>
          {isRTL ? "الذهاب إلى لوحة التحكم" : "Accéder à mon espace"}
        </Button>
      </div>
    </div>
  );

  // ---------- Sidebar Step Indicator ----------
  const renderSidebar = () => (
    <div className="w-full lg:w-72 shrink-0">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-6">
        <div className="space-y-4">
          {STEPS.map((step, idx) => {
            const isActive = step.num === currentStep;
            const isCompleted = step.num < currentStep;
            return (
              <div key={step.num} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200 ${
                    isCompleted
                      ? "bg-green-500 text-white shadow-sm"
                      : isActive
                        ? "bg-red-500 text-white shadow-md shadow-red-200"
                        : "bg-slate-100 text-slate-400"
                  }`}>
                    {isCompleted ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      step.num
                    )}
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div className={`w-0.5 h-8 mt-1 ${isCompleted ? "bg-green-400" : "bg-slate-200"}`} />
                  )}
                </div>
                <div className="pt-1.5">
                  <p className={`text-sm leading-tight ${
                    isActive ? "text-red-600 font-semibold" : isCompleted ? "text-slate-600" : "text-slate-400"
                  }`}>
                    {isRTL ? step.labelAr : step.labelFr}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-4 border-t border-slate-100">
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-xs font-medium text-slate-600 mb-2">
              {isRTL ? "هل تحتاج مساعدة؟" : "Besoin d'aide ?"}
            </p>
            <p className="text-xs text-slate-500 mb-3">
              {isRTL
                ? "إذا واجهت أي مشكلة أثناء التقديم، يمكنك التواصل مع فريق الدعم."
                : "Si vous rencontrez un problème, contactez notre équipe de support."}
            </p>
            <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => window.open("mailto:support@promosport.tn")}>
              <svg className="w-3.5 h-3.5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              {isRTL ? "دليل المساعدة" : "Guide d'aide"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  // ---------- Main Layout ----------
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4" dir={isRTL ? "rtl" : "ltr"}>
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            {renderConfirmation()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {isRTL ? "تقديم طلب ترشح" : "INSCRIPTION CANDIDAT"}
            </h1>
            {lastSaved && (
              <p className="text-xs text-slate-500 mt-0.5">
                {isRTL ? "آخر حفظ تلقائي: " : "Dernier enregistrement: "}
                {lastSaved.toLocaleTimeString(locale === "ar" ? "ar-TN" : "fr-FR")}
              </p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => window.open("mailto:support@promosport.tn")}>
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            {isRTL ? "مساعدة؟" : "Besoin d'aide ?"}
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          {renderSidebar()}

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              {currentStep === 1 && renderStep1()}
              {currentStep === 2 && renderStep2()}
              {currentStep === 3 && renderStep3()}
              {currentStep === 4 && renderStep4()}
              {currentStep === 5 && renderStep5()}
              {currentStep === 6 && renderStep6()}
            </div>

            {/* Navigation */}
            {currentStep <= 6 && (
              <div className="flex justify-between mt-6">
                {currentStep > 1 ? (
                  <Button variant="outline" onClick={handleBack}>
                    <svg className={`w-4 h-4 ${isRTL ? "rotate-180" : ""} mr-2`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    {isRTL ? "السابق" : "Précédent"}
                  </Button>
                ) : <div />}
                {currentStep < 6 ? (
                  <Button onClick={handleNext}>
                    {isRTL ? "التالي" : "Suivant"}
                    <svg className={`w-4 h-4 ${isRTL ? "rotate-180" : ""} ml-2`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Button>
                ) : (
                  <Button onClick={handleSubmit} disabled={loading}>
                    {loading ? (isRTL ? "جار الإرسال..." : "Envoi...") : (isRTL ? "إرسال الطلب" : "Soumettre ma candidature")}
                  </Button>
                )}
              </div>
            )}

            {/* Data Protection Notice */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
              <svg className="w-5 h-5 mt-0.5 shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-blue-900">
                  {isRTL ? "حماية البيانات الشخصية" : "Protection des données personnelles"}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  {isRTL
                    ? "تخضع المعلومات التي تقدمها في هذا النموذج للحماية بموجب القانون العام لحماية البيانات (GDPR). سيتم استخدام بياناتك فقط لأغراض معالجة طلب الترشح الخاص بك."
                    : "Les informations que vous fournissez dans ce formulaire sont protégées conformément au RGPD. Vos données seront utilisées uniquement pour le traitement de votre candidature."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
