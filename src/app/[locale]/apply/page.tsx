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
import { HelpCircle, FileText } from "lucide-react";

const GOVERNORATES = [
  { value: "Ariana", labelAr: "أريانة" },
  { value: "Béja", labelAr: "باجة" },
  { value: "Ben Arous", labelAr: "بن عروس" },
  { value: "Bizerte", labelAr: "بنزرت" },
  { value: "Gabès", labelAr: "قابس" },
  { value: "Gafsa", labelAr: "قفصة" },
  { value: "Jendouba", labelAr: "جندوبة" },
  { value: "Kairouan", labelAr: "القيروان" },
  { value: "Kasserine", labelAr: "القصرين" },
  { value: "Kébili", labelAr: "قبلي" },
  { value: "Le Kef", labelAr: "الكاف" },
  { value: "Mahdia", labelAr: "المهدية" },
  { value: "Manouba", labelAr: "منوبة" },
  { value: "Medenine", labelAr: "مدنين" },
  { value: "Monastir", labelAr: "المنستير" },
  { value: "Nabeul", labelAr: "نابل" },
  { value: "Sfax", labelAr: "صفاقس" },
  { value: "Sidi Bouzid", labelAr: "سيدي بوزيد" },
  { value: "Siliana", labelAr: "سليانة" },
  { value: "Sousse", labelAr: "سوسة" },
  { value: "Tataouine", labelAr: "تطاوين" },
  { value: "Tozeur", labelAr: "توزر" },
  { value: "Tunis", labelAr: "تونس" },
  { value: "Zaghouan", labelAr: "زغوان" },
];

const STUDY_LEVELS = [
  { value: "BAC", label: "Baccalauréat", labelAr: "بكالوريا" },
  { value: "BAC_PLUS_2", label: "Bac + 2 (DEUG)", labelAr: "باك + 2" },
  { value: "LICENCE", label: "Licence (Bac + 3)", labelAr: "إجازة (باك + 3)" },
  { value: "MAITRISE", label: "Maîtrise (Bac + 4)", labelAr: "أستاذية (باك + 4)" },
  { value: "MASTER", label: "Master (Bac + 5)", labelAr: "ماجستير (باك + 5)" },
  { value: "DOCTORAT", label: "Doctorat", labelAr: "دكتوراه" },
];

const DOCUMENT_TYPES = [
  { key: "cin", labelFr: "Copie de la CIN", labelAr: "نسخة من بطاقة التعريف الوطنية" },
  { key: "diploma", labelFr: "Copie du diplôme ou attestation de réussite", labelAr: "نسخة من الشهادة أو شهادة النجاح" },
  { key: "photo", labelFr: "Photo d'identité récente", labelAr: "صورة شمسية حديثة" },
  { key: "cv", labelFr: "Curriculum Vitae (CV)", labelAr: "السيرة الذاتية" },
  { key: "letter", labelFr: "Lettre de motivation", labelAr: "رسالة تحفيز" },
  { key: "extract", labelFr: "Extrait de naissance n°3", labelAr: "مضمون ولادة عدد 3" },
  { key: "record", labelFr: "Casier judiciaire", labelAr: "بطاقة عدد 3" },
  { key: "military", labelFr: "Attestation de situation militaire", labelAr: "شهادة الوضعية تجاه الخدمة الوطنية" },
  { key: "work", labelFr: "Attestation de travail (si expérience)", labelAr: "شهادة عمل (إن وجد)" },
];

const FAMILY_STATUSES = [
  { value: "CELIBATAIRE", labelFr: "Célibataire", labelAr: "أعزب" },
  { value: "MARIE", labelFr: "Marié(e)", labelAr: "متزوج" },
  { value: "DIVORCE", labelFr: "Divorcé(e)", labelAr: "مطلق" },
  { value: "VEUF", labelFr: "Veuf(ve)", labelAr: "أرمل" },
];

const NATIONALITIES = [
  { value: "Tunisienne", labelFr: "Tunisienne", labelAr: "تونسية" },
  { value: "Autre", labelFr: "Autre", labelAr: "أخرى" },
];

// Job selection deliberately precedes the academic step: the job's track
// (ACADEMIC = diploma required, MANUAL = declared education level) determines
// what step 3 must collect. Selecting later would invalidate step 3 retroactively.
const STEPS = [
  { num: 1, labelFr: "Informations personnelles", labelAr: "المعلومات الشخصية" },
  { num: 2, labelFr: "Choix du poste", labelAr: "اختيار الوظيفة" },
  { num: 3, labelFr: "Parcours académique", labelAr: "المسار الأكاديمي" },
  { num: 4, labelFr: "Expérience professionnelle", labelAr: "الخبرة المهنية" },
  { num: 5, labelFr: "Pièces justificatives", labelAr: "الوثائق المطلوبة" },
  { num: 6, labelFr: "Validation", labelAr: "التأكيد" },
];

// Declared school level, used by MANUAL-track jobs (maintenance, multi-skilled,
// cleaners) where no academic diploma is required.
const EDU_LEVELS = [
  { value: "NONE", labelFr: "Sans diplôme", labelAr: "بدون شهادة" },
  { value: "PRIMARY", labelFr: "Primaire", labelAr: "ابتدائي" },
  { value: "MIDDLE", labelFr: "Collège", labelAr: "إعدادي" },
  { value: "SECONDARY", labelFr: "Secondaire", labelAr: "ثانوي" },
  { value: "VOCATIONAL", labelFr: "Formation professionnelle", labelAr: "تكوين مهني" },
];

const EDU_LEVEL_ORDER: Record<string, number> = {
  NONE: 0,
  PRIMARY: 1,
  MIDDLE: 2,
  SECONDARY: 3,
  VOCATIONAL: 4,
};

const EDU_LEVEL_LABEL: Record<string, { fr: string; ar: string }> = EDU_LEVELS.reduce(
  (acc, l) => ({ ...acc, [l.value]: { fr: l.labelFr, ar: l.labelAr } }),
  {} as Record<string, { fr: string; ar: string }>
);

const PROFILE_LABEL: Record<string, { fr: string; ar: string }> = {
  ACADEMIC: { fr: "Diplôme requis", ar: "شهادة دراسية مطلوبة" },
  MANUAL: { fr: "Pas de diplôme requis", ar: "بدون شهادة دراسية" },
};

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
  const [jobs, setJobs] = useState<Array<{
    id: string;
    code: string;
    titleFr: string;
    titleAr: string;
    deadline: string;
    profile?: string;
    minEduLevel?: string;
  }>>([]);

  const [accountData, setAccountData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    termsAccepted: false,
  });

  const [personalData, setPersonalData] = useState({
    lastName: formData.personalInfo?.lastName || "",
    fullName: formData.personalInfo?.fullName || formData.personalInfo?.lastName || "",
    firstName: formData.personalInfo?.firstName || "",
    cin: formData.personalInfo?.cin || "",
    dateOfBirth: formData.personalInfo?.dateOfBirth || "",
    birthPlace: formData.personalInfo?.birthPlace || "",
    gender: (formData.personalInfo?.gender || "MALE") as "MALE" | "FEMALE",
    familyStatus: formData.personalInfo?.familyStatus || "",
    numberOfChildren: formData.personalInfo?.numberOfChildren ?? 0,
    nationality: formData.personalInfo?.nationality || "",
    phone: formData.personalInfo?.phone || "",
    governorate: formData.personalInfo?.governorate || "",
    delegation: formData.personalInfo?.delegation || "",
    address: formData.personalInfo?.address || "",
    postalCode: formData.personalInfo?.postalCode || "",
    smsOptIn: formData.personalInfo?.smsOptIn ?? true,
  });

  const [diplomas, setDiplomas] = useState<Diploma[]>(
    formData.academicInfo?.diplomas?.length
      ? formData.academicInfo.diplomas
      : [{ studyLevel: "", diploma: "", institution: "", grade: "", graduationYear: new Date().getFullYear() }]
  );

  const [moyenneBac, setMoyenneBac] = useState(formData.academicInfo?.moyenneBac || "");
  const [moyenne1ere, setMoyenne1ere] = useState(formData.academicInfo?.moyenne1ere || "");
  const [moyenne2eme, setMoyenne2eme] = useState(formData.academicInfo?.moyenne2eme || "");
  const [moyenne3eme, setMoyenne3eme] = useState(formData.academicInfo?.moyenne3eme || "");

  const [eduLevel, setEduLevel] = useState(formData.academicInfo?.eduLevel || "");
  const [hasCertification, setHasCertification] = useState(
    Boolean(formData.academicInfo?.hasCertification)
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
  const [confirmedDocs, setConfirmedDocs] = useState<string[]>([]);
  const [docsAcknowledged, setDocsAcknowledged] = useState(false);

  const [termsAccepted, setTermsAccepted] = useState(formData.termsAccepted || false);
  const [certificationSigned, setCertificationSigned] = useState(formData.certificationSigned || false);

  // Bumped to _v2: the wizard steps were reordered (job selection moved from
  // step 5 to step 2), so stored step numbers from the old order are invalid.
  const STEP_STORAGE_KEY = "application_current_step_v2";

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedStep = localStorage.getItem(STEP_STORAGE_KEY);
      if (savedStep) {
        const parsed = parseInt(savedStep);
        if (parsed >= 1 && parsed <= 6) setCurrentStep(parsed);
      }
    }
  }, [setCurrentStep]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STEP_STORAGE_KEY, String(currentStep));
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

  const hasCompleteDiploma = diplomas.some(
    (d) => d.studyLevel && d.diploma && d.institution && d.grade
  );

  const selectedJobData = jobs.find((j) => j.id === selectedJob);
  const selectedProfile = selectedJobData?.profile || "ACADEMIC";

  // Explains why the chosen job's academic requirements are not yet met.
  // Rendered on the academic step (3), where the candidate can act on it.
  const eligibilityError: string | null = (() => {
    if (!selectedJobData) return null;
    if (selectedProfile === "MANUAL") {
      if (!eduLevel) {
        return isRTL
          ? "هذه الوظيفة لا تتطلب شهادة دراسية، لكن يجب تحديد مستواك الدراسي"
          : "Ce poste n'exige pas de diplôme, mais vous devez indiquer votre niveau d'études";
      }
      const required = selectedJobData.minEduLevel || "SECONDARY";
      if ((EDU_LEVEL_ORDER[eduLevel] ?? 0) < (EDU_LEVEL_ORDER[required] ?? 0)) {
        const label = EDU_LEVEL_LABEL[required];
        return isRTL
          ? `مستواك الحالي أقل من المطلوب لهذه الوظيفة: ${label?.ar ?? required}`
          : `Votre niveau est inférieur au minimum requis pour ce poste : ${label?.fr ?? required}`;
      }
      return null;
    }
    if (!hasCompleteDiploma) {
      return isRTL
        ? "هذه الوظيفة تتطلب شهادة دراسية كاملة"
        : "Ce poste exige au moins un diplôme complet";
    }
    return null;
  })();

  // The operational track does not require prior experience, so the experience
  // step (4) is not part of its form and navigation steps straight over it.
  const isManualTrack = selectedProfile === "MANUAL";
  const EXPERIENCE_STEP = 4;

  const getNextStep = (from: number): number => {
    let next = from + 1;
    if (isManualTrack && next === EXPERIENCE_STEP) next = EXPERIENCE_STEP + 1;
    return Math.min(next, 6);
  };

  const getPrevStep = (from: number): number => {
    let prev = from - 1;
    if (isManualTrack && prev === EXPERIENCE_STEP) prev = EXPERIENCE_STEP - 1;
    return Math.max(prev, 1);
  };

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
        // Only requires a selection. Academic requirements are validated in
        // step 3, where the candidate can actually satisfy them.
        return !!selectedJob;
      case 3:
        // Academic requirements depend on the track of the chosen job.
        if (selectedProfile === "MANUAL") {
          if (!eduLevel) return false;
          const required = selectedJobData?.minEduLevel || "SECONDARY";
          return (EDU_LEVEL_ORDER[eduLevel] ?? 0) >= (EDU_LEVEL_ORDER[required] ?? 0);
        }
        // ACADEMIC (and the transient no-job-selected case): diploma required.
        return hasCompleteDiploma;
      case 4:
        // Not part of the operational track's form; navigation skips it.
        if (isManualTrack) return true;
        if (!hasExperience) return true;
        return experiences.some((e) => e.company && e.position && e.startDate);
      case 5:
        return true;
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
    }     else if (step === 2) updateFormData("jobSelection", { jobId: selectedJob });
    else if (step === 3) {
      // Operational candidates have no diplomas or grades; storing empty
      // arrays/strings keeps the submission payload shape identical.
      updateFormData("academicInfo", isManualTrack
        ? { diplomas: [], moyenneBac: "", moyenne1ere: "", moyenne2eme: "", moyenne3eme: "", eduLevel, hasCertification }
        : { diplomas, moyenneBac, moyenne1ere, moyenne2eme, moyenne3eme, eduLevel, hasCertification });
    }
    else if (step === 4) updateFormData("experienceInfo", { hasExperience, experiences });
    else if (step === 5) updateFormData("documents", { files: uploadedFiles });
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
      fullName: personalData.fullName,
      cin: personalData.cin,
      dateOfBirth: personalData.dateOfBirth,
      gender: personalData.gender,
      phone: formatPhone(personalData.phone),
      nationality: personalData.nationality,
      address: personalData.address,
      postalCode: personalData.postalCode,
      governorate: personalData.governorate,
      delegation: personalData.delegation,
      smsOptIn: personalData.smsOptIn,
    };

    const registerRes = await fetch(`/api/auth/register?locale=${locale}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(registrationPayload),
    });

    const registerData = registerRes.ok ? await registerRes.json().catch(() => ({})) : await registerRes.json().catch(() => ({}));

    if (!registerRes.ok) {
      const errText = typeof registerData.error === "string" ? registerData.error : "";
      const isDuplicate = registerData.code === "EMAIL_EXISTS";

      setError(
        isDuplicate
          ? (isRTL
            ? "هذا البريد الإلكتروني مسجل مسبقاً. يرجى تسجيل الدخول أو استعمال بريد إلكتروني آخر."
            : "Cet email est déjà enregistré. Connectez-vous ou utilisez une autre adresse email.")
          : (errText || (isRTL ? "فشل إنشاء الحساب" : "Échec de la création du compte"))
      );
      return null;
    }

    const normalizedEmail = accountData.email.trim().toLowerCase();
    const signInResult = await signIn("credentials", {
      email: normalizedEmail,
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

    const candidateId = registerData.candidateId;

    if (candidateId) {
      return candidateId;
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
      setError(stepErrorMessage(currentStep));
      return;
    }

    syncStepToContext(currentStep);
    setCurrentStep(getNextStep(currentStep));
  };

  // Specific, actionable message per step instead of a generic
  // "fill all required fields", which left candidates stuck with no clue
  // about what was missing or where.
  const stepErrorMessage = (step: number): string => {
    switch (step) {
      case 2:
        return isRTL ? "يرجى اختيار الوظيفة" : "Veuillez sélectionner un poste";
      case 3:
        if (selectedProfile === "MANUAL") {
          if (!eduLevel) {
            return isRTL
              ? "يرجى تحديد مستواك الدراسي"
              : "Veuillez sélectionner votre niveau d'études";
          }
          return isRTL
            ? `مستواك الأدنى هو: ${EDU_LEVEL_LABEL[selectedJobData?.minEduLevel || "SECONDARY"]?.ar}`
            : `Votre niveau est inférieur au minimum requis (${EDU_LEVEL_LABEL[selectedJobData?.minEduLevel || "SECONDARY"]?.fr})`;
        }
        return isRTL
          ? "يرجى إدخال شهادة دراسية كاملة (المستوى، الشهادة، المؤسسة، المعدل)"
          : "Veuillez saisir au moins un diplôme complet (niveau, intitulé, établissement, note)";
      case 4:
        return isRTL
          ? "يرجى إكمال معلومات الخبرة المهنية"
          : "Veuillez compléter votre expérience professionnelle";
      case 6:
        return isRTL
          ? "يرجى قبول الشروط والتوقيع على التصريح"
          : "Veuillez accepter les conditions et signer la déclaration";
      default:
        return isRTL
          ? "يرجى إكمال جميع الحقول المطلوبة"
          : "Veuillez remplir tous les champs obligatoires";
    }
  };

  const handleBack = () => {
    setError("");
    setCurrentStep(getPrevStep(currentStep));
  };

  // Jump directly to any already-visited step (sidebar navigation).
  const handleGoToStep = (step: number) => {
    setError("");
    // Never land on the experience step for the operational track.
    if (isManualTrack && step === EXPERIENCE_STEP) {
      setCurrentStep(
        currentStep > EXPERIENCE_STEP ? EXPERIENCE_STEP + 1 : EXPERIENCE_STEP - 1
      );
      return;
    }
    setCurrentStep(Math.min(Math.max(step, 1), 6));
  };

  // If the candidate switches to an operational job while sitting on the
  // experience step, move them off it immediately.
  useEffect(() => {
    if (isManualTrack && currentStep === EXPERIENCE_STEP) {
      setCurrentStep(EXPERIENCE_STEP + 1);
    }
  }, [isManualTrack, currentStep]);

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

    if (eligibilityError) {
      setError(eligibilityError);
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
        fullName: (personalData.firstName + " " + personalData.lastName).trim(),
        cin: personalData.cin,
        dateOfBirth: personalData.dateOfBirth,
        birthPlace: personalData.birthPlace,
        gender: personalData.gender,
        familyStatus: personalData.familyStatus,
        numberOfChildren: personalData.numberOfChildren,
        nationality: personalData.nationality,
        phone: formatPhone(personalData.phone),
        address: personalData.address,
        postalCode: personalData.postalCode,
        governorate: personalData.governorate,
        delegation: personalData.delegation,
        email: accountData.email,
      },
      academicInfo: isManualTrack
        ? { diplomas: [], moyenneBac: "", moyenne1ere: "", moyenne2eme: "", moyenne3eme: "", eduLevel, hasCertification }
        : { diplomas, moyenneBac, moyenne1ere, moyenne2eme, moyenne3eme, eduLevel, hasCertification },
      // Operational track carries no prior-experience requirement.
      experienceInfo: isManualTrack
        ? { hasExperience: false, experiences: [] }
        : { hasExperience, experiences },
      jobSelection: { jobId: selectedJob },
      eduLevel: eduLevel || null,
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
          localStorage.removeItem(STEP_STORAGE_KEY);
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
        <div className="flex items-center gap-4 pb-6 border-b-2 border-gray-200">
          <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full shadow-md">
            <span className="text-lg font-bold">🔑</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{isRTL ? "معلومات الحساب" : "INFORMATIONS DU COMPTE"}</h2>
            <p className="text-sm text-gray-500 mt-1">{isRTL ? "أنشئ حسابك للمتابعة" : "Créez votre compte pour continuer"}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
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
        <div className="flex items-center gap-4 pb-6 border-b-2 border-gray-200">
          <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 text-white rounded-full shadow-md">
            <span className="text-lg font-bold">👤</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{isRTL ? "المعلومات الشخصية" : "INFORMATIONS PERSONNELLES"}</h2>
            <p className="text-sm text-gray-500 mt-1">{isRTL ? "يرجى تقديم معلوماتك الدقيقة" : "Veuillez fournir vos informations exactes"}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="space-y-1.5">
            <Label htmlFor="lastName" className="text-sm">
              {isRTL ? "اللقب" : "Nom"} <span className="text-red-500">*</span>
            </Label>
            <Input id="lastName" value={personalData.lastName}
              onChange={(e) => setPersonalData({ ...personalData, lastName: e.target.value, fullName: e.target.value })}
              placeholder={isRTL ? "مثال: DUPONT" : "Ex: DUPONT"} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="firstName" className="text-sm">
              {isRTL ? "الاسم" : "Prénom"} <span className="text-red-500">*</span>
            </Label>
            <Input id="firstName" value={personalData.firstName}
              onChange={(e) => setPersonalData({ ...personalData, firstName: e.target.value })}
              placeholder={isRTL ? "مثال: محمد" : "Ex: Jean"} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cin" className="text-sm">
              {isRTL ? "رقم بطاقة التعريف" : "Numéro CIN"} <span className="text-red-500">*</span>
            </Label>
            <Input id="cin" value={personalData.cin}
              onChange={(e) => setPersonalData({ ...personalData, cin: e.target.value })}
              placeholder="12345678" required maxLength={8} pattern="[0-9]{8}" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dateOfBirth" className="text-sm">
              {isRTL ? "تاريخ الولادة" : "Date de naissance"} <span className="text-red-500">*</span>
            </Label>
            <Input id="dateOfBirth" type="date" value={personalData.dateOfBirth}
              onChange={(e) => setPersonalData({ ...personalData, dateOfBirth: e.target.value })} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="birthPlace" className="text-sm">
              {isRTL ? "مكان الولادة" : "Lieu de naissance"} <span className="text-red-500">*</span>
            </Label>
            <Input id="birthPlace" value={personalData.birthPlace}
              onChange={(e) => setPersonalData({ ...personalData, birthPlace: e.target.value })}
              placeholder={isRTL ? "مثال: تونس" : "Ex: Tunis"} required />
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
            <Label htmlFor="nationality" className="text-sm">
              {isRTL ? "الجنسية" : "Nationalité"} <span className="text-red-500">*</span>
            </Label>
            <select id="nationality" value={personalData.nationality}
              onChange={(e) => setPersonalData({ ...personalData, nationality: e.target.value })}
              className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">{isRTL ? "اختر" : "Sélectionner"}</option>
              {NATIONALITIES.map((n) => (
                <option key={n.value} value={n.value}>{isRTL ? n.labelAr : n.labelFr}</option>
              ))}
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
              {isRTL ? "رقم الهاتف" : "Téléphone"} <span className="text-red-500">*</span>
            </Label>
            <Input id="phone" value={personalData.phone}
              onChange={(e) => setPersonalData({ ...personalData, phone: e.target.value })}
              placeholder={isRTL ? "مثال: 20123456" : "Ex: 20123456"} required maxLength={8} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="governorate" className="text-sm">
              {isRTL ? "الولاية" : "Gouvernorat"} <span className="text-red-500">*</span>
            </Label>
            <select id="governorate" value={personalData.governorate}
              onChange={(e) => setPersonalData({ ...personalData, governorate: e.target.value })}
              className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">{isRTL ? "اختر الولاية" : "Sélectionner"}</option>
              {GOVERNORATES.map((g) => (
                <option key={g.value} value={g.value}>{isRTL ? g.labelAr : g.value}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="delegation" className="text-sm">
              {isRTL ? "المعتمدية" : "Délégation"} <span className="text-red-500">*</span>
            </Label>
            <Input id="delegation" value={personalData.delegation}
              onChange={(e) => setPersonalData({ ...personalData, delegation: e.target.value })} required />
          </div>
          {/* Address full width */}
          <div className="md:col-span-2 space-y-1.5">
            <Label htmlFor="address" className="text-sm">
              {isRTL ? "العنوان الكامل" : "Adresse complète"} <span className="text-red-500">*</span>
            </Label>
            <Input id="address" value={personalData.address}
              onChange={(e) => setPersonalData({ ...personalData, address: e.target.value })}
              placeholder={isRTL ? "مثال: 123 نهج السلام، شقة 4" : "Ex: 123 Rue de la Paix, Appartement 4"} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="postalCode" className="text-sm">
              {isRTL ? "الرمز البريدي" : "Code postal"}
            </Label>
            <Input id="postalCode" value={personalData.postalCode}
              onChange={(e) => setPersonalData({ ...personalData, postalCode: e.target.value })}
              placeholder={isRTL ? "مثال: 1002" : "Ex: 1002"} />
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

  const renderAcademic = () => (
    <div className="space-y-6">
      {eligibilityError && (
        <div
          role="alert"
          className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3"
        >
          <svg className="w-5 h-5 mt-0.5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-red-800">{eligibilityError}</p>
        </div>
      )}
      <div className="flex items-center gap-4 pb-6 border-b-2 border-gray-200">
        <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full shadow-md">
          <FileText size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {selectedProfile === "MANUAL"
              ? (isRTL ? "المستوى الدراسي" : "NIVEAU D'ÉTUDES")
              : (isRTL ? "المسار الأكاديمي" : "PARCOURS ACADÉMIQUE")}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {selectedProfile === "MANUAL"
              ? (isRTL
                  ? "هذه الوظيفة لا تتطلب شهادة دراسية. حدّد مستواك الدراسي فقط."
                  : "Ce poste n'exige aucun diplôme. Indiquez simplement votre niveau d'études.")
              : (isRTL ? "يرجى إدراج شهاداتك الدراسية" : "Veuillez ajouter vos diplômes")}
          </p>
        </div>
      </div>

      {/* Niveau d'études — the only academic input required for the operational
          track (maintenance, polyvalents, cleaning staff). For ACADEMIC posts it
          stays visible but optional; those are validated on the diplomas below. */}
      <Card className={selectedProfile === "MANUAL" ? "border-amber-400 bg-amber-50/60" : "border-amber-300 bg-amber-50/50"}>
        <CardContent className="p-5 space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-slate-800">
              {isRTL ? "المستوى الدراسي" : "Niveau d'études"}
            </h4>
            <p className="text-xs text-slate-600 mt-1">
              {isRTL
                ? "مطلوب للوظائف التي لا تتطلب شهادة دراسية. يمكنك تركه فارغًا إذا كنت تترشح إلى وظيفة تتطلب شهادة."
                : "Requis pour les postes sans diplôme (maintenance, polyvalents, agents d'entretien). Vous pouvez laisser vide si vous postulez à un poste exigeant un diplôme."}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm">{isRTL ? "المستوى" : "Niveau"}</Label>
              <select
                value={eduLevel}
                onChange={(e) => setEduLevel(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{isRTL ? "غير محدد" : "Non précisé"}</option>
                {EDU_LEVELS.map((level) => (
                  <option key={level.value} value={level.value}>
                    {isRTL ? level.labelAr : level.labelFr}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasCertification}
                  onChange={(e) => setHasCertification(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                {isRTL
                  ? "لدي شهادة تكوين مهني"
                  : "Je détiens une attestation de formation professionnelle"}
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Diplômes — ACADEMIC track only. The operational track has no academic
          background requirement, so these inputs are not rendered at all. */}
      {selectedProfile !== "MANUAL" && (
      <div className="space-y-4">
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
                      <option key={level.value} value={level.value}>{isRTL ? level.labelAr : level.label}</option>
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
      </div>
      )}

      {/* Moyennes — ACADEMIC track only. Grades are meaningless for the
          operational track, which is scored on declared level instead. */}
      {selectedProfile !== "MANUAL" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm">{isRTL ? "معدل الباكالوريا" : "Moyenne de bac"}</Label>
              <Input value={moyenneBac}
                onChange={(e) => setMoyenneBac(e.target.value)}
                placeholder={isRTL ? "مثال: 14.5" : "Ex: 14.5"} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">{isRTL ? "معدل السنة الأولى" : "Moyenne 1ère année"}</Label>
              <Input value={moyenne1ere}
                onChange={(e) => setMoyenne1ere(e.target.value)}
                placeholder={isRTL ? "مثال: 13.0" : "Ex: 13.0"} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">{isRTL ? "معدل السنة الثانية" : "Moyenne 2ème année"}</Label>
              <Input value={moyenne2eme}
                onChange={(e) => setMoyenne2eme(e.target.value)}
                placeholder={isRTL ? "مثال: 12.5" : "Ex: 12.5"} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">{isRTL ? "معدل السنة الثالثة" : "Moyenne 3ème année"}</Label>
              <Input value={moyenne3eme}
                onChange={(e) => setMoyenne3eme(e.target.value)}
                placeholder={isRTL ? "مثال: 15.0" : "Ex: 15.0"} />
            </div>
          </div>

          <Button type="button" variant="outline" onClick={addDiploma} className="w-full border-dashed">
            + {isRTL ? "إضافة شهادة أخرى" : "Ajouter un autre diplôme"}
          </Button>
        </>
      )}
    </div>
  );

  const renderExperience = () => (
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

  // Operational staff (maintenance, general-purpose, cleaning) are only asked
  // for identity and a photo. Academic attestations, a CV, a motivation letter
  // and a criminal record extract are not relevant to that category.
  const MANUAL_DOC_KEYS = ["cin", "photo"];
  const documentTypes = isManualTrack
    ? DOCUMENT_TYPES.filter((d) => MANUAL_DOC_KEYS.includes(d.key))
    : DOCUMENT_TYPES;

  const renderDocuments = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-4 pb-6 border-b-2 border-gray-200">
        <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-full shadow-md">
          <FileText size={20} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-2xl font-bold text-gray-900">
              {isRTL ? "الوثائق" : "Pièces justificatives"}
            </h2>
            <span className="text-[11px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              {isRTL ? "اختياري" : "Optionnel"}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {isRTL
              ? "يمكنك تأكيد الوثائق المتوفرة لديك ورفعها الآن، أو تخطي هذه الخطوة وإضافتها لاحقًا."
              : "Vous pouvez indiquer vos documents et les téléverser maintenant, ou simplement passer à l'étape suivante et les fournir plus tard."}
          </p>
        </div>
      </div>

      <div className="p-5 bg-slate-50 rounded-xl border border-slate-200">
        <div className="flex gap-3">
          <HelpCircle size={20} className="text-slate-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-slate-700">
            {isRTL
              ? "هذه الخطوة اختيارية بالكامل. إذا لم تكن الوثائق جاهزة الآن، يمكنك إكمال التسجيل وتقديمها لاحقًا عند الطلب."
              : "Cette étape est entièrement optionnelle. Si vos documents ne sont pas prêts maintenant, vous pouvez finaliser votre inscription et les fournir ultérieurement sur demande."}
          </p>
        </div>
      </div>

      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-3">
          {isRTL ? "حدد الوثائق المتوفرة لديك" : "Cochez les documents dont vous disposez"}
        </h3>
        {isManualTrack && (
          <p className="text-sm text-slate-600 mb-3">
            {isRTL
              ? "فئة الأعوان المتعاملين: بطاقة التعريف الوطنية وصورة شمسية فقط."
              : "Catégorie agents d'exécution : CIN et photo d'identité uniquement."}
          </p>
        )}
        <div className="space-y-2">
          {documentTypes.map((doc) => {
            const checked = confirmedDocs.includes(doc.key);
            return (
              <label
                key={doc.key}
                className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${checked ? "bg-blue-50 border-blue-300" : "bg-white border-gray-200 hover:bg-slate-50"}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    setConfirmedDocs(
                      checked ? confirmedDocs.filter((k) => k !== doc.key) : [...confirmedDocs, doc.key]
                    );
                  }}
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className={`text-sm font-medium flex-1 ${checked ? "text-blue-800" : "text-gray-700"}`}>
                  {isRTL ? doc.labelAr : doc.labelFr}
                </span>
                {checked && (
                  <span className="text-blue-600 text-xs font-semibold">
                    ✓ {isRTL ? "متوفر" : "Disponible"}
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </div>

      <div className={`p-4 rounded-xl border ${docsAcknowledged ? "bg-blue-50 border-blue-300" : "bg-white border-gray-200"}`}>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={docsAcknowledged}
            onChange={() => setDocsAcknowledged(!docsAcknowledged)}
            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-0.5"
          />
          <span className="text-sm text-gray-600">
            {isRTL
              ? "أقر بأنني سأقدم الوثائق المحددة عند الطلب. (اختياري)"
              : "Je m'engage à fournir les documents cochés sur demande. (facultatif)"}
          </span>
        </label>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {isRTL ? "رفع الوثائق (اختياري)" : "Téléversement des documents (optionnel)"}
        </h3>
        <p className="text-sm text-gray-500 mb-3">
          {isRTL
            ? "يمكنك رفع الوثائق الآن أو لاحقًا عند تقديم طلبك."
            : "Vous pouvez téléverser vos documents maintenant ou plus tard lors du dépôt de candidature."}
        </p>
        <FileDropzone
          value={uploadedFiles}
          onChange={handleFilesChange}
          locale={isRTL ? "ar" : "fr"}
          docType="application_document"
        />
      </div>
    </div>
  );

  const renderJobSelection = () => (
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
                    <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                      job.profile === "MANUAL"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-blue-100 text-blue-800"
                    }`}>
                      {(() => {
                        const base = PROFILE_LABEL[job.profile || "ACADEMIC"];
                        const lbl = isRTL ? base.ar : base.fr;
                        if (job.profile === "MANUAL") {
                          const req = EDU_LEVEL_LABEL[job.minEduLevel || "SECONDARY"];
                          const reqLbl = isRTL ? req.ar : req.fr;
                          return `${lbl} · ${reqLbl}+`;
                        }
                        return lbl;
                      })()}
                    </span>
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
            <div><span className="text-slate-500">{isRTL ? "الاسم واللقب" : "Nom complet"}:</span> {(personalData.firstName + " " + personalData.lastName).trim()}</div>
            <div><span className="text-slate-500">{isRTL ? "الاسم" : "Prénom"}:</span> {personalData.firstName}</div>
            <div><span className="text-slate-500">{isRTL ? "رقم بطاقة التعريف" : "CIN"}:</span> {personalData.cin}</div>
            <div><span className="text-slate-500">{isRTL ? "رقم الهاتف" : "Téléphone"}:</span> {personalData.phone}</div>
            <div><span className="text-slate-500">{isRTL ? "الولاية" : "Gouvernorat"}:</span> {personalData.governorate}</div>
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
          link.href = `/api/candidate/applications/${successAppId}/pdf`;
          link.target = "_blank";
          link.click();
        }}>
          {isRTL ? "📄 تحميل مطلب الترشح" : "📄 Télécharger la demande"}
        </Button>
        <Button variant="outline" onClick={() => router.push(`/${locale}/dashboard`)}>
          {isRTL ? "الذهاب إلى لوحة التحكم" : "Accéder à mon espace"}
        </Button>
      </div>
    </div>
  );

  // ---------- Sidebar Step Indicator ----------
  // Operational track: the experience step is not part of the form, so it is
  // hidden from the stepper rather than shown as a dead end.
  const visibleSteps = STEPS.filter((s) => !(isManualTrack && s.num === EXPERIENCE_STEP));

  const renderSidebar = () => (
    <div className="w-full lg:w-72 shrink-0">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-6">
        <div className="space-y-4">
          {visibleSteps.map((step, idx) => {
            const isActive = step.num === currentStep;
            const isCompleted = step.num < currentStep;
            // Completed steps stay clickable so a candidate who picked the
            // wrong track or job can go back and correct it without having to
            // click "Précédent" repeatedly.
            return (
              <button
                key={step.num}
                type="button"
                onClick={() => isCompleted && handleGoToStep(step.num)}
                disabled={!isCompleted}
                className={`flex items-start gap-3 w-full text-start rounded-lg transition-colors ${
                  isCompleted ? "hover:bg-slate-50 cursor-pointer" : "cursor-default"
                }`}
              >
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
                  {idx < visibleSteps.length - 1 && (
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
              </button>
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
            <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => window.location.href = `/${locale}/guide#apply`}>
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
              {currentStep === 2 && renderJobSelection()}
              {currentStep === 3 && renderAcademic()}
              {currentStep === 4 && renderExperience()}
              {currentStep === 5 && renderDocuments()}
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
