"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, HelpCircle, Lock, Briefcase, FileText, CheckCircle2, Shield } from "lucide-react";

const GOVERNORATES = [
  "Ariana", "Béja", "Ben Arous", "Bizerte", "Gabès", "Gafsa", "Jendouba", "Kairouan",
  "Kasserine", "Kébili", "Le Kef", "Mahdia", "Manouba", "Medenine", "Monastir", "Nabeul",
  "Sfax", "Sidi Bouzid", "Siliana", "Sousse", "Tataouine", "Tozeur", "Tunis", "Zaghouan",
];

const STEPS = [
  { id: 1, label: "Informations personnelles" },
  { id: 2, label: "Parcours académique" },
  { id: 3, label: "Expérience professionnelle" },
  { id: 4, label: "Pièces justificatives" },
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
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === "number") {
      setFormData({ ...formData, [name]: parseInt(value) });
    } else {
      setFormData({ ...formData, [name]: value });
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
      const res = await fetch(`/api/auth/register?locale=${locale}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed");
        setLoading(false);
        return;
      }

      router.push(`/${locale}/verify-email?candidateId=${data.candidateId}`);
    } catch {
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">INSCRIPTION CANDIDAT</h1>
            <p className="text-sm text-gray-500 mt-1">Concours de recrutement externe 2025 • Plateforme PROMOSPORT</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors border border-red-200">
            <HelpCircle size={18} />
            <span className="text-sm font-medium">Besoin d'aide ?</span>
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
              Étape {currentStep}/{STEPS.length}
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
                      ? "bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-600 shadow-md"
                      : currentStep > step.id
                      ? "bg-gray-50 hover:bg-gray-100 border-l-4 border-gray-300"
                      : "bg-white border-l-4 border-gray-200 hover:bg-gray-50"
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
                    <p
                      className={`text-sm font-bold truncate ${
                        currentStep === step.id ? "text-red-700" : currentStep > step.id ? "text-green-700" : "text-gray-600"
                      }`}
                    >
                      {step.label}
                    </p>
                    {currentStep > step.id && (
                      <p className="text-xs text-green-600 font-semibold mt-1">Complété</p>
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
                  <p className="text-sm font-bold text-gray-900">Besoin d'assistance ?</p>
                  <p className="text-xs text-gray-700 mt-2 leading-relaxed">Consultez notre guide complet ou contactez notre support.</p>
                  <button className="mt-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors w-full">
                    Voir le guide complet
                  </button>
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-xl">
              <p className="text-xs text-purple-700 font-semibold">
                💡 <span className="ml-2">Temps estimé : 15-20 minutes</span>
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
                        <h2 className="text-2xl font-bold text-gray-900">INFORMATIONS PERSONNELLES</h2>
                        <p className="text-sm text-gray-500 mt-1">Veuillez fournir vos informations exactes</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="fullName" className="text-sm font-semibold text-gray-700">Nom complet *</Label>
                        <Input
                          id="fullName"
                          name="fullName"
                          placeholder="Ex: DUPONT"
                          value={formData.fullName}
                          onChange={handleChange}
                          required
                          className="mt-1 h-11 border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="firstName" className="text-sm font-semibold text-gray-700">Prénom *</Label>
                        <Input
                          id="firstName"
                          name="firstName"
                          placeholder="Ex: Jean"
                          value={formData.firstName}
                          onChange={handleChange}
                          required
                          className="mt-1 h-11 border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="dateOfBirth" className="text-sm font-semibold text-gray-700">Date de naissance *</Label>
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
                        <Label htmlFor="birthPlace" className="text-sm font-semibold text-gray-700">Lieu de naissance *</Label>
                        <Input
                          id="birthPlace"
                          name="birthPlace"
                          placeholder="Ex: Tunis"
                          value={formData.birthPlace}
                          onChange={handleChange}
                          required
                          className="mt-1 h-11 border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="cin" className="text-sm font-semibold text-gray-700">Numéro CIN *</Label>
                        <Input
                          id="cin"
                          name="cin"
                          placeholder="Ex: 12345678"
                          value={formData.cin}
                          onChange={handleChange}
                          required
                          maxLength={8}
                          className="mt-1 h-11 border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="nationality" className="text-sm font-semibold text-gray-700">Nationalité *</Label>
                        <select
                          id="nationality"
                          name="nationality"
                          value={formData.nationality}
                          onChange={handleChange}
                          className="flex h-11 w-full mt-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          required
                        >
                          <option value="Tunisienne">Tunisienne</option>
                          <option value="Autre">Autre</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="familyStatus" className="text-sm font-semibold text-gray-700">Situation familiale</Label>
                        <select
                          id="familyStatus"
                          name="familyStatus"
                          value={formData.familyStatus}
                          onChange={handleChange}
                          className="flex h-11 w-full mt-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        >
                          <option value="">Sélectionner</option>
                          <option value="Célibataire">Célibataire</option>
                          <option value="Marié(e)">Marié(e)</option>
                          <option value="Divorcé(e)">Divorcé(e)</option>
                          <option value="Veuf(ve)">Veuf(ve)</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="numberOfChildren" className="text-sm font-semibold text-gray-700">Nombre d'enfants</Label>
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
                        <Label htmlFor="phone" className="text-sm font-semibold text-gray-700">Téléphone *</Label>
                        <Input
                          id="phone"
                          name="phone"
                          placeholder="Ex: 20 123 456"
                          value={formData.phone}
                          onChange={handleChange}
                          required
                          className="mt-1 h-11 border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-semibold text-gray-700">Email *</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          placeholder="exemple@email.com"
                          value={formData.email}
                          onChange={handleChange}
                          required
                          className="mt-1 h-11 border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        />
                      </div>

                      <div className="md:col-span-2 space-y-2">
                        <Label htmlFor="address" className="text-sm font-semibold text-gray-700">Adresse complète *</Label>
                        <Input
                          id="address"
                          name="address"
                          placeholder="Ex: 123 Rue de la Paix, Appartement 4"
                          value={formData.address}
                          onChange={handleChange}
                          required
                          className="mt-1 h-11 border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="governorate" className="text-sm font-semibold text-gray-700">Gouvernorat *</Label>
                        <select
                          id="governorate"
                          name="governorate"
                          value={formData.governorate}
                          onChange={handleChange}
                          className="flex h-11 w-full mt-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          required
                        >
                          <option value="">Sélectionner un gouvernorat</option>
                          {GOVERNORATES.map((g) => (
                            <option key={g} value={g}>
                              {g}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="delegation" className="text-sm font-semibold text-gray-700">Délégation *</Label>
                        <select
                          id="delegation"
                          name="delegation"
                          value={formData.delegation}
                          onChange={handleChange}
                          className="flex h-11 w-full mt-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          required
                        >
                          <option value="">Sélectionner une délégation</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="postalCode" className="text-sm font-semibold text-gray-700">Code postal</Label>
                        <Input
                          id="postalCode"
                          name="postalCode"
                          placeholder="Ex: 1002"
                          value={formData.postalCode}
                          onChange={handleChange}
                          className="mt-1 h-11 border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2-5: Placeholder for future steps */}
                {currentStep > 1 && currentStep < 6 && (
                  <div className="p-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl text-center border-2 border-dashed border-gray-300">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-300 text-gray-600 rounded-full mb-4">
                      <FileText size={32} />
                    </div>
                    <p className="text-gray-700 font-semibold text-lg">Étape {currentStep}</p>
                    <p className="text-gray-500 text-sm mt-2">Contenu en cours de développement</p>
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
                        <h2 className="text-2xl font-bold text-gray-900">VALIDATION FINALE</h2>
                        <p className="text-sm text-gray-500 mt-1">Veuillez confirmer votre inscription</p>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-500 rounded-xl p-6">
                      <div className="flex gap-4">
                        <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={24} />
                        <p className="text-sm text-gray-800 leading-relaxed">
                          En validant cette inscription, vous déclarez sur l'honneur que toutes les informations fournies sont exactes et complètes. Vous certifiez aussi remplir les conditions générales et spécifiques requises pour le poste demandé.
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
                          J'accepte les <span className="text-red-600 font-bold">conditions générales d'utilisation</span> et je confirme l'exactitude des informations fournies. *
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
                          J'accepte la <span className="text-red-600 font-bold">politique de confidentialité</span> et le traitement de mes données personnelles. *
                        </Label>
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="flex gap-4 p-5 bg-red-50 border-l-4 border-red-600 rounded-xl">
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
                    {currentStep === 1 ? "Annuler" : "← Retour"}
                  </Button>
                  <Button
                    type="submit"
                    className="px-8 h-12 font-semibold bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg hover:shadow-xl transition-all"
                    disabled={loading}
                  >
                    {loading ? "Chargement..." : currentStep === STEPS.length ? "✓ Valider l'inscription" : "Étape suivante →"}
                  </Button>
                </div>
              </form>

              {/* Data Protection Notice */}
              <div className="mt-10 p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-blue-600 rounded-xl">
                <div className="flex gap-4">
                  <Shield size={22} className="text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-gray-900">🔒 Protection des données personnelles</p>
                    <p className="text-xs text-gray-700 mt-2 leading-relaxed">
                      Vos données sont collectées et traitées conformément à la loi organique n° 2004-63 du 27 juillet 2004 relative à la protection des données personnelles. Elles ne seront utilisées que dans le cadre de ce concours de recrutement.
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