"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { FileDropzone, UploadedFile } from "@/components/file-dropzone";
import { AlertCircle, HelpCircle, Lock, Briefcase, FileText, CheckCircle2, Shield } from "lucide-react";

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

const AR_STEPS = [
  { id: 1, label: "المعلومات الشخصية" },
  { id: 2, label: "المسار الأكاديمي" },
  { id: 3, label: "الخبرة المهنية" },
  { id: 4, label: "الوثائق", optional: true },
  { id: 5, label: "اختيار الوظيفة" },
  { id: 6, label: "التأكيد" },
];

const FR_STEPS = [
  { id: 1, label: "Informations personnelles" },
  { id: 2, label: "Parcours académique" },
  { id: 3, label: "Expérience professionnelle" },
  { id: 4, label: "Pièces justificatives", optional: true },
  { id: 5, label: "Choix du poste" },
  { id: 6, label: "Validation" },
];

export default function RegisterPage() {
  const t = useTranslations("auth");
  const candT = useTranslations("candidate");
  const params = useParams();
  const locale = (params.locale as string) || "fr";
  const isRTL = locale === "ar";
  const router = useRouter();
  
  const STEPS = isRTL ? AR_STEPS : FR_STEPS;

  const [currentStep, setCurrentStep] = useState(1);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    firstName: "",
    cin: "",
    dateOfBirth: "",
    birthPlace: "",
    gender: "MALE" as "MALE" | "FEMALE",
    phone: "",
    numberOfChildren: 0,
    governorate: "",
    delegation: "",
    postalCode: "",
    address: "",
    familyStatus: "",
    nationality: "Tunisienne",
    smsOptIn: true,
  });
  const [diplomas, setDiplomas] = useState<Diploma[]>([
    { studyLevel: "", diploma: "", institution: "", grade: "", graduationYear: new Date().getFullYear() }
  ]);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [hasExperience, setHasExperience] = useState(false);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [confirmedDocs, setConfirmedDocs] = useState<string[]>([]);
  const [docsAcknowledged, setDocsAcknowledged] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedFile[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

  const addExperience = () => {
    setExperiences([...experiences, { company: "", position: "", startDate: "", endDate: "", isCurrent: false, description: "" }]);
  };

  const removeExperience = (index: number) => {
    if (experiences.length > 1) {
      setExperiences(experiences.filter((_, i) => i !== index));
    }
  };

  const updateExperience = (index: number, field: string, value: string | boolean) => {
    setExperiences(experiences.map((e, i) => i === index ? { ...e, [field]: value } : e));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === "number") {
      setFormData({ ...formData, [name]: parseInt(value) });
    } else {
      setFormData({ ...formData, [name]: value });
    }
    if (name === "password") {
      const errors: string[] = [];
      if (value.length < 8) errors.push(isRTL ? "8 أحرف على الأقل" : "8 caractères minimum");
      if (!/[A-Z]/.test(value)) errors.push(isRTL ? "حرف كبير واحد على الأقل" : "1 lettre majuscule minimum");
      if (!/[a-z]/.test(value)) errors.push(isRTL ? "حرف صغير واحد على الأقل" : "1 lettre minuscule minimum");
      if (!/[0-9]/.test(value)) errors.push(isRTL ? "رقم واحد على الأقل" : "1 chiffre minimum");
      setPasswordErrors(errors);
    }
  };

  const handleNextStep = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
      setError("");
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const documentIds = uploadedDocs
        .map((f) => f.id)
        .filter((id): id is string => typeof id === "string" && id.length > 0);

      const res = await fetch(`/api/auth/register?locale=${locale}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          diplomas,
          hasExperience,
          experiences,
          documentIds,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || (isRTL ? "فشل التسجيل" : "Registration failed"));
        setLoading(false);
        return;
      }

      router.push(`/${locale}/verify-email?candidateId=${data.candidateId}`);
    } catch {
      setError(isRTL ? "حدث خطأ. يرجى المحاولة مرة أخرى." : "An error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">{isRTL ? "تسجيل المرشح" : "INSCRIPTION CANDIDAT"}</h1>
            <p className="text-sm text-gray-500 mt-1">{isRTL ? "مناظرات التوظيف الخارجية 2025 • منصة PROMOSPORT" : "Concours de recrutement externe 2025 • Plateforme PROMOSPORT"}</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors border border-red-200">
            <HelpCircle size={18} />
            <span className="text-sm font-medium">{isRTL ? "مساعدة؟" : "Besoin d'aide ?"}</span>
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-200 h-1 rounded-full overflow-hidden">
              <div
                className="bg-red-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / STEPS.length) * 100}%` }}
              ></div>
            </div>
            <span className="text-sm font-semibold text-gray-600 ml-4">
              {isRTL ? `الخطوة ${currentStep}/${STEPS.length}` : `Étape ${currentStep}/${STEPS.length}`}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
          {/* Sidebar - Steps */}
          <div className="lg:col-span-1">
            <div className="space-y-3 sticky top-24">
              {STEPS.map((step, index) => (
                <div
                  key={step.id}
                  onClick={() => currentStep > step.id && setCurrentStep(step.id)}
                  className={`flex items-start gap-4 p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                    currentStep === step.id
                      ? `bg-gradient-to-r from-red-50 to-red-100 ${isRTL ? 'border-r-4' : 'border-l-4'} border-red-600 shadow-md`
                      : currentStep > step.id
                      ? `bg-gray-50 hover:bg-gray-100 ${isRTL ? 'border-r-4' : 'border-l-4'} border-gray-300`
                      : `bg-white ${isRTL ? 'border-r-4' : 'border-l-4'} border-gray-200 hover:bg-gray-50`
                  }`}
                >
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm flex-shrink-0 transition-all duration-200 ${
                      currentStep === step.id
                        ? "bg-red-600 text-white ring-4 ring-red-200"
                        : currentStep > step.id
                        ? "bg-green-500 text-white"
                        : "bg-gray-300 text-white"
                    }`}
                  >
                    {currentStep > step.id ? "✓" : step.id}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p
                        className={`text-sm font-bold truncate ${
                          currentStep === step.id ? "text-red-700" : currentStep > step.id ? "text-green-700" : "text-gray-600"
                        }`}
                      >
                        {step.label}
                      </p>
                      {step.optional && (
                        <span className="text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                          {isRTL ? "اختياري" : "Optionnel"}
                        </span>
                      )}
                    </div>
                    {currentStep > step.id && (
                      <p className="text-xs text-green-600 font-semibold mt-1">{isRTL ? "مكتمل" : "Complété"}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Help Section */}
            <div className="mt-10 p-5 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl shadow-sm">
              <div className="flex gap-3">
                <HelpCircle size={22} className="text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-gray-900">{isRTL ? "هل تحتاج مساعدة؟" : "Besoin d'assistance ?"}</p>
                  <p className="text-xs text-gray-700 mt-2 leading-relaxed">{isRTL ? "راجع دليلنا الكامل أو اتصل بفريق الدعم." : "Consultez notre guide complet ou contactez notre support."}</p>
                  <button className="mt-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors w-full">
                    {isRTL ? "عرض الدليل الكامل" : "Voir le guide complet"}
                  </button>
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-xl">
              <p className="text-xs text-purple-700 font-semibold">
                💡 <span className="ml-2">{isRTL ? "الوقت المقدر: 15-20 دقيقة" : "Temps estimé : 15-20 minutes"}</span>
              </p>
            </div>
          </div>

          {/* Main Form Area */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <form onSubmit={currentStep === STEPS.length ? handleSubmit : (e) => { e.preventDefault(); handleNextStep(); }} className="space-y-8">
                {/* Step 1: Informations Personnelles */}
                {currentStep === 1 && (
                  <div className="space-y-8">
                    <div className="flex items-center gap-4 pb-6 border-b-2 border-gray-200">
                      <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 text-white rounded-full shadow-md">
                        <span className="text-lg font-bold">👤</span>
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">{isRTL ? "المعلومات الشخصية" : "INFORMATIONS PERSONNELLES"}</h2>
                        <p className="text-sm text-gray-500 mt-1">{isRTL ? "يرجى تقديم معلوماتك الدقيقة" : "Veuillez fournir vos informations exactes"}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="fullName" className="text-sm font-semibold text-gray-700">{isRTL ? "الاسم الكامل *" : "Nom complet *"}</Label>
                        <Input
                          id="fullName"
                          name="fullName"
                          placeholder={isRTL ? "مثال: عبد الله" : "Ex: DUPONT"}
                          value={formData.fullName}
                          onChange={handleChange}
                          required
                          className="mt-1 h-11 border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="firstName" className="text-sm font-semibold text-gray-700">{isRTL ? "الاسم *" : "Prénom *"}</Label>
                        <Input
                          id="firstName"
                          name="firstName"
                          placeholder={isRTL ? "مثال: محمد" : "Ex: Jean"}
                          value={formData.firstName}
                          onChange={handleChange}
                          required
                          className="mt-1 h-11 border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="dateOfBirth" className="text-sm font-semibold text-gray-700">{isRTL ? "تاريخ الولادة *" : "Date de naissance *"}</Label>
                        <Input
                          id="dateOfBirth"
                          name="dateOfBirth"
                          type="date"
                          value={formData.dateOfBirth}
                          onChange={handleChange}
                          required
                          className="mt-1 h-11 border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="birthPlace" className="text-sm font-semibold text-gray-700">{isRTL ? "مكان الولادة *" : "Lieu de naissance *"}</Label>
                        <Input
                          id="birthPlace"
                          name="birthPlace"
                          placeholder={isRTL ? "مثال: تونس" : "Ex: Tunis"}
                          value={formData.birthPlace}
                          onChange={handleChange}
                          required
                          className="mt-1 h-11 border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="cin" className="text-sm font-semibold text-gray-700">{isRTL ? "رقم بطاقة التعريف *" : "Numéro CIN *"}</Label>
                        <Input
                          id="cin"
                          name="cin"
                          placeholder={isRTL ? "مثال: 12345678" : "Ex: 12345678"}
                          value={formData.cin}
                          onChange={handleChange}
                          required
                          maxLength={8}
                          className="mt-1 h-11 border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="nationality" className="text-sm font-semibold text-gray-700">{isRTL ? "الجنسية *" : "Nationalité *"}</Label>
                        <select
                          id="nationality"
                          name="nationality"
                          value={formData.nationality}
                          onChange={handleChange}
                          className="flex h-11 w-full mt-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          required
                        >
                          <option value="Tunisienne">{isRTL ? "تونسية" : "Tunisienne"}</option>
                          <option value="Autre">{isRTL ? "أخرى" : "Autre"}</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="familyStatus" className="text-sm font-semibold text-gray-700">{isRTL ? "الوضع العائلي" : "Situation familiale"}</Label>
                        <select
                          id="familyStatus"
                          name="familyStatus"
                          value={formData.familyStatus}
                          onChange={handleChange}
                          className="flex h-11 w-full mt-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        >
                          <option value="">{isRTL ? "اختر" : "Sélectionner"}</option>
                          <option value="Célibataire">{isRTL ? "أعزب" : "Célibataire"}</option>
                          <option value="Marié(e)">{isRTL ? "متزوج" : "Marié(e)"}</option>
                          <option value="Divorcé(e)">{isRTL ? "مطلق" : "Divorcé(e)"}</option>
                          <option value="Veuf(ve)">{isRTL ? "أرمل" : "Veuf(ve)"}</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="numberOfChildren" className="text-sm font-semibold text-gray-700">{isRTL ? "عدد الأطفال" : "Nombre d'enfants"}</Label>
                        <Input
                          id="numberOfChildren"
                          name="numberOfChildren"
                          type="number"
                          placeholder="0"
                          value={formData.numberOfChildren}
                          onChange={handleChange}
                          min="0"
                          className="mt-1 h-11 border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-sm font-semibold text-gray-700">{isRTL ? "رقم الهاتف *" : "Téléphone *"}</Label>
                        <Input
                          id="phone"
                          name="phone"
                          placeholder={isRTL ? "مثال: 20 123 456" : "Ex: 20 123 456"}
                          value={formData.phone}
                          onChange={handleChange}
                          required
                          className="mt-1 h-11 border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-semibold text-gray-700">{isRTL ? "البريد الإلكتروني *" : "Email *"}</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          placeholder={isRTL ? "example@email.com" : "exemple@email.com"}
                          value={formData.email}
                          onChange={handleChange}
                          required
                          className="mt-1 h-11 border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password" className="text-sm font-semibold text-gray-700">{isRTL ? "كلمة المرور *" : "Mot de passe *"}</Label>
                        <Input
                          id="password"
                          name="password"
                          type="password"
                          placeholder={isRTL ? "8 أحرف على الأقل" : "8 caractères minimum"}
                          value={formData.password}
                          onChange={handleChange}
                          required
                          className="mt-1 h-11 border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        />
                        {formData.password && passwordErrors.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {passwordErrors.map((err, i) => (
                              <p key={i} className="text-xs text-red-500 flex items-center gap-1">
                                <span>✗</span> {err}
                              </p>
                            ))}
                          </div>
                        )}
                        {formData.password && passwordErrors.length === 0 && (
                          <p className="text-xs text-green-600 flex items-center gap-1 mt-2">
                            <span>✓</span> {isRTL ? "كلمة المرور قوية" : "Mot de passe valide"}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-sm font-semibold text-gray-700">{isRTL ? "تأكيد كلمة المرور *" : "Confirmer le mot de passe *"}</Label>
                        <Input
                          id="confirmPassword"
                          name="confirmPassword"
                          type="password"
                          placeholder={isRTL ? "أعد إدخال كلمة المرور" : "Retaper le mot de passe"}
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          required
                          className="mt-1 h-11 border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        />
                        {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                          <p className="text-xs text-red-500 flex items-center gap-1 mt-2">
                            <span>✗</span> {isRTL ? "كلمة المرور غير متطابقة" : "Les mots de passe ne correspondent pas"}
                          </p>
                        )}
                      </div>

                      <div className="md:col-span-2 space-y-2">
                        <Label htmlFor="address" className="text-sm font-semibold text-gray-700">{isRTL ? "العنوان الكامل *" : "Adresse complète *"}</Label>
                        <Input
                          id="address"
                          name="address"
                          placeholder={isRTL ? "مثال: 123 نهج السلام، شقة 4" : "Ex: 123 Rue de la Paix, Appartement 4"}
                          value={formData.address}
                          onChange={handleChange}
                          required
                          className="mt-1 h-11 border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="governorate" className="text-sm font-semibold text-gray-700">{isRTL ? "الولاية *" : "Gouvernorat *"}</Label>
                        <select
                          id="governorate"
                          name="governorate"
                          value={formData.governorate}
                          onChange={handleChange}
                          className="flex h-11 w-full mt-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          required
                        >
                          <option value="">{isRTL ? "اختر ولاية" : "Sélectionner un gouvernorat"}</option>
                          {GOVERNORATES.map((g) => (
                            <option key={g} value={g}>
                              {g}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="delegation" className="text-sm font-semibold text-gray-700">{isRTL ? "المعتمدية *" : "Délégation *"}</Label>
                        <Input
                          id="delegation"
                          name="delegation"
                          placeholder={isRTL ? "مثال: تونس المدينة" : "Ex: Tunis Ville"}
                          value={formData.delegation}
                          onChange={handleChange}
                          required
                          className="mt-1 h-11 border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="postalCode" className="text-sm font-semibold text-gray-700">{isRTL ? "الرمز البريدي" : "Code postal"}</Label>
                        <Input
                          id="postalCode"
                          name="postalCode"
                          placeholder={isRTL ? "مثال: 1002" : "Ex: 1002"}
                          value={formData.postalCode}
                          onChange={handleChange}
                          className="mt-1 h-11 border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Parcours académique */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-4 pb-6 border-b-2 border-gray-200">
                      <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full shadow-md">
                        <FileText size={20} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">{isRTL ? "المسار الأكاديمي" : "PARCOURS ACADÉMIQUE"}</h2>
                        <p className="text-sm text-gray-500 mt-1">{isRTL ? "يرجى إدراج شهاداتك الدراسية" : "Veuillez ajouter vos diplômes"}</p>
                      </div>
                    </div>

                    {diplomas.map((diploma, index) => (
                      <Card key={index}>
                        <CardContent className="p-5 space-y-4">
                          <div className="flex justify-between items-center">
                            <h4 className="text-sm font-semibold text-gray-800">
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
                            <div className="space-y-2">
                              <Label className="text-sm font-semibold text-gray-700">{isRTL ? "المستوى الدراسي *" : "Niveau d'étude *"}</Label>
                              <select value={diploma.studyLevel}
                                onChange={(e) => updateDiploma(index, "studyLevel", e.target.value)}
                                className="flex h-11 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent">
                                <option value="">{isRTL ? "اختر المستوى" : "Sélectionner"}</option>
                                {STUDY_LEVELS.map((level) => (
                                  <option key={level.value} value={level.value}>{level.label}</option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-semibold text-gray-700">{isRTL ? "الشهادة *" : "Diplôme *"}</Label>
                              <Input value={diploma.diploma}
                                onChange={(e) => updateDiploma(index, "diploma", e.target.value)}
                                placeholder={isRTL ? "مثال: إجازة في العلوم" : "Ex: Licence en Sciences"} />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-semibold text-gray-700">{isRTL ? "المؤسسة *" : "Institution *"}</Label>
                              <Input value={diploma.institution}
                                onChange={(e) => updateDiploma(index, "institution", e.target.value)}
                                placeholder={isRTL ? "مثال: جامعة تونس" : "Ex: Université de Tunis"} />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-semibold text-gray-700">{isRTL ? "التقدير *" : "Mention *"}</Label>
                              <Input value={diploma.grade}
                                onChange={(e) => updateDiploma(index, "grade", e.target.value)}
                                placeholder={isRTL ? "مثال: جيد جداً" : "Ex: Très bien"} />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-semibold text-gray-700">{isRTL ? "سنة التخرج *" : "Année d'obtention *"}</Label>
                              <Input type="number" value={diploma.graduationYear}
                                onChange={(e) => updateDiploma(index, "graduationYear", parseInt(e.target.value))}
                                min={1960} max={new Date().getFullYear()} />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    <Button type="button" variant="outline" onClick={addDiploma} className="w-full border-dashed">
                      + {isRTL ? "إضافة شهادة أخرى" : "Ajouter un autre diplôme"}
                    </Button>
                  </div>
                )}

                {/* Step 3: Expérience professionnelle */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-4 pb-6 border-b-2 border-gray-200">
                      <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-full shadow-md">
                        <Briefcase size={20} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">{isRTL ? "الخبرة المهنية" : "EXPÉRIENCE PROFESSIONNELLE"}</h2>
                        <p className="text-sm text-gray-500 mt-1">{isRTL ? "يرجى ذكر خبراتك المهنية السابقة" : "Veuillez indiquer vos expériences professionnelles"}</p>
                      </div>
                    </div>

                    <div className="p-5 bg-gray-50 rounded-xl">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={hasExperience}
                          onChange={(e) => { setHasExperience(e.target.checked); if (!e.target.checked) setExperiences([]); }}
                          className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500"
                        />
                        <span className="text-sm font-semibold text-gray-700">{isRTL ? "لدي خبرة مهنية سابقة" : "J'ai une expérience professionnelle"}</span>
                      </label>
                    </div>

                    {hasExperience && (
                      <>
                        {experiences.map((exp, index) => (
                          <Card key={index}>
                            <CardContent className="p-5 space-y-4">
                              <div className="flex justify-between items-center">
                                <h4 className="text-sm font-semibold text-gray-800">
                                  {isRTL ? `الخبرة ${index + 1}` : `Expérience ${index + 1}`}
                                </h4>
                                {experiences.length > 1 && (
                                  <Button type="button" variant="ghost" size="sm" onClick={() => removeExperience(index)}
                                    className="text-red-500 hover:text-red-700">
                                    {isRTL ? "حذف" : "Supprimer"}
                                  </Button>
                                )}
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label className="text-sm font-semibold text-gray-700">{isRTL ? "المؤسسة / الشركة *" : "Entreprise *"}</Label>
                                  <Input value={exp.company}
                                    onChange={(e) => updateExperience(index, "company", e.target.value)}
                                    placeholder={isRTL ? "مثال: شركة PROMOSPORT" : "Ex: PROMOSPORT"} />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-sm font-semibold text-gray-700">{isRTL ? "المنصب *" : "Poste occupé *"}</Label>
                                  <Input value={exp.position}
                                    onChange={(e) => updateExperience(index, "position", e.target.value)}
                                    placeholder={isRTL ? "مثال: مهندس تطوير" : "Ex: Ingénieur développeur"} />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-sm font-semibold text-gray-700">{isRTL ? "تاريخ البداية *" : "Date de début *"}</Label>
                                  <Input type="date" value={exp.startDate}
                                    onChange={(e) => updateExperience(index, "startDate", e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-sm font-semibold text-gray-700">{isRTL ? "تاريخ النهاية" : "Date de fin"}</Label>
                                  <Input type="date" value={exp.endDate}
                                    onChange={(e) => updateExperience(index, "endDate", e.target.value)}
                                    disabled={exp.isCurrent} />
                                </div>
                              </div>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={exp.isCurrent}
                                  onChange={(e) => updateExperience(index, "isCurrent", e.target.checked)}
                                  className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500" />
                                <span className="text-sm text-gray-700">{isRTL ? "أعمل حالياً في هذا المنصب" : "Je travaille actuellement à ce poste"}</span>
                              </label>
                              <div className="space-y-2">
                                <Label className="text-sm font-semibold text-gray-700">{isRTL ? "الوصف" : "Description"}</Label>
                                <textarea value={exp.description}
                                  onChange={(e) => updateExperience(index, "description", e.target.value)}
                                  className="flex min-h-[80px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                  rows={3}
                                  placeholder={isRTL ? "صف مهامك ومسؤولياتك..." : "Décrivez vos missions et responsabilités..."} />
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
                )}

                {/* Step 4: Pièces justificatives (optionnel) */}
                {currentStep === 4 && (
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
                      <div className="space-y-2">
                        {DOCUMENT_TYPES.map((doc) => {
                          const checked = confirmedDocs.includes(doc.key);
                          return (
                            <label
                              key={doc.key}
                              className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                                checked
                                  ? "bg-blue-50 border-blue-300"
                                  : "bg-white border-gray-200 hover:bg-slate-50"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  setConfirmedDocs(
                                    checked
                                      ? confirmedDocs.filter((k) => k !== doc.key)
                                      : [...confirmedDocs, doc.key]
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

                    <div className={`p-4 rounded-xl border ${
                      docsAcknowledged ? "bg-blue-50 border-blue-300" : "bg-white border-gray-200"
                    }`}>
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
                        value={uploadedDocs}
                        onChange={setUploadedDocs}
                        locale={isRTL ? "ar" : "fr"}
                        docType="registration_document"
                      />
                    </div>

                    <div className="flex justify-end pt-4 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={handleNextStep}
                        className="px-5 h-11 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        {isRTL ? "تخطي والمتابعة ←" : "Passer cette étape →"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 5: Placeholder */}
                {currentStep === 5 && (
                  <div className="p-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl text-center border-2 border-dashed border-gray-300">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-300 text-gray-600 rounded-full mb-4">
                      <FileText size={32} />
                    </div>
                    <p className="text-gray-700 font-semibold text-lg">{isRTL ? `الخطوة ${currentStep}` : `Étape ${currentStep}`}</p>
                    <p className="text-gray-500 text-sm mt-2">{isRTL ? "المحتوى قيد التطوير" : "Contenu en cours de développement"}</p>
                  </div>
                )}

                {/* Step 6: Validation */}
                {currentStep === 6 && (
                  <div className="space-y-8">
                    <div className="flex items-center gap-4 pb-6 border-b-2 border-gray-200">
                      <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-full shadow-md">
                        <CheckCircle2 size={24} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">{isRTL ? "التأكيد النهائي" : "VALIDATION FINALE"}</h2>
                        <p className="text-sm text-gray-500 mt-1">{isRTL ? "يرجى تأكيد تسجيلك" : "Veuillez confirmer votre inscription"}</p>
                      </div>
                    </div>

                    <div className={`bg-gradient-to-r from-yellow-50 to-orange-50 ${isRTL ? 'border-r-4' : 'border-l-4'} border-yellow-500 rounded-xl p-6`}>
                      <div className="flex gap-4">
                        <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={24} />
                        <p className="text-sm text-gray-800 leading-relaxed">
                          {isRTL ? "بالتأكيد على هذا التسجيل، تقر بأن جميع المعلومات المقدمة دقيقة وكاملة. كما تشهد بأنك تستوفي الشروط العامة والخاصة المطلوبة للوظيفة المتقدم إليها." : "En validant cette inscription, vous déclarez sur l'honneur que toutes les informations fournies sont exactes et complètes. Vous certifiez aussi remplir les conditions générales et spécifiques requises pour le poste demandé."}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4 p-6 bg-blue-50 border border-blue-200 rounded-xl">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          id="terms"
                          required
                          className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500 mt-1"
                        />
                        <Label htmlFor="terms" className="text-sm font-normal cursor-pointer text-gray-700">
                          {isRTL ? "أوافق على " : "J'accepte les "}<span className="text-red-600 font-bold">{isRTL ? "الشروط العامة للاستخدام" : "conditions générales d'utilisation"}</span>{isRTL ? " وأؤكد صحة المعلومات المقدمة. *" : " et je confirme l'exactitude des informations fournies. *"}
                        </Label>
                      </div>
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          id="privacy"
                          required
                          className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500 mt-1"
                        />
                        <Label htmlFor="privacy" className="text-sm font-normal cursor-pointer text-gray-700">
                          {isRTL ? "أوافق على " : "J'accepte la "}<span className="text-red-600 font-bold">{isRTL ? "سياسة الخصوصية" : "politique de confidentialité"}</span>{isRTL ? " ومعالجة بياناتي الشخصية. *" : " et le traitement de mes données personnelles. *"}
                        </Label>
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className={`flex gap-4 p-5 bg-red-50 ${isRTL ? 'border-r-4' : 'border-l-4'} border-red-600 rounded-xl`}>
                    <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={22} />
                    <p className="text-sm text-red-800 font-medium">{error}</p>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between pt-8 border-t-2 border-gray-200">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={currentStep === 1 ? () => router.back() : handlePreviousStep}
                    className="px-8 h-12 font-semibold text-gray-700 border-gray-300 hover:bg-gray-100"
                  >
                    {currentStep === 1 ? (isRTL ? "إلغاء" : "Annuler") : (isRTL ? "→ رجوع" : "← Retour")}
                  </Button>
                  <Button
                    type="submit"
                    className="px-8 h-12 font-semibold bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg hover:shadow-xl transition-all"
                    disabled={loading}
                  >
                    {loading ? (isRTL ? "جار التحميل..." : "Chargement...") : currentStep === STEPS.length ? (isRTL ? "✓ تأكيد التسجيل" : "✓ Valider l'inscription") : (isRTL ? "الخطوة التالية ←" : "Étape suivante →")}
                  </Button>
                </div>
              </form>

              {/* Data Protection Notice */}
              <div className={`mt-10 p-6 bg-gradient-to-r from-blue-50 to-purple-50 ${isRTL ? 'border-r-4' : 'border-l-4'} border-blue-600 rounded-xl`}>
                <div className="flex gap-4">
                  <Shield size={22} className="text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-gray-900">{isRTL ? "🔒 حماية البيانات الشخصية" : "🔒 Protection des données personnelles"}</p>
                    <p className="text-xs text-gray-700 mt-2 leading-relaxed">
                      {isRTL ? "يتم جمع ومعالجة بياناتك وفقًا للقانون الأساسي رقم 2004-63 المؤرخ في 27 يوليو 2004 المتعلق بحماية البيانات الشخصية. لن تُستخدم إلا في إطار مناظرة التوظيف هذه." : "Vos données sont collectées et traitées conformément à la loi organique n° 2004-63 du 27 juillet 2004 relative à la protection des données personnelles. Elles ne seront utilisées que dans le cadre de ce concours de recrutement."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}