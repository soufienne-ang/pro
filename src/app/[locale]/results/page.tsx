"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Search } from "lucide-react";

interface CandidateInfo {
  fullName: string;
  email: string;
  cin: string;
  phone: string;
  governorate: string;
}

interface ResultItem {
  applicationId: string;
  jobId: string;
  jobCode: string;
  jobTitleAr: string;
  jobTitleFr: string;
  status: string;
  archived: boolean;
  applicationScore: number;
  oralTotal: number;
  totalScore: number;
  rank: number | null;
  criteriaDetails: { name: string; weight: number; value: number }[];
}

export default function PublicResultsPage() {
  const params = useParams();
  const locale = (params.locale as string) || "fr";
  const isRTL = locale === "ar";

  const [cin, setCin] = useState("");
  const [candidate, setCandidate] = useState<CandidateInfo | null>(null);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cin.trim()) return;

    setLoading(true);
    setSearched(true);
    setError("");
    setCandidate(null);
    setResults([]);

    try {
      const res = await fetch(`/api/results?cin=${encodeURIComponent(cin.trim())}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError(isRTL ? "لم يتم العثور على نتائج لهذا الرقم" : "Aucun résultat trouvé pour ce CIN");
        } else {
          setError(isRTL ? "حدث خطأ أثناء البحث" : "Erreur lors de la recherche");
        }
        return;
      }
      const data = await res.json();
      setCandidate(data.candidate);
      setResults(data.results);
    } catch {
      setError(isRTL ? "حدث خطأ أثناء البحث" : "Erreur lors de la recherche");
    } finally {
      setLoading(false);
    }
  };

  const statusLabels: Record<string, { ar: string; fr: string }> = {
    PENDING: { ar: "قيد الانتظار", fr: "En attente" },
    UNDER_REVIEW: { ar: "قيد المراجعة", fr: "En cours" },
    APPROVED: { ar: "مقبول", fr: "Approuvé" },
    REJECTED: { ar: "مرفوض", fr: "Rejeté" },
    ORAL_TEST: { ar: "اختبار شفوي", fr: "Oral" },
    FINAL_LIST: { ar: "قائمة نهائية", fr: "Liste finale" },
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl" dir={isRTL ? "rtl" : "ltr"}>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">
          {isRTL ? "نتائج المناظرات" : "Résultats des concours"}
        </h1>
        <p className="text-muted-foreground">
          {isRTL
            ? "أدخل رقم بطاقة التعريف الوطنية للاطلاع على نتائجك"
            : "Entrez votre numéro CIN pour consulter vos résultats"}
        </p>
      </div>

      <form onSubmit={handleSearch} className="max-w-md mx-auto mb-8">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={cin}
              onChange={(e) => setCin(e.target.value)}
              placeholder={isRTL ? "رقم بطاقة التعريف الوطنية" : "Numéro CIN"}
              className="flex h-12 w-full rounded-lg border border-input bg-background px-4 text-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
              maxLength={20}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !cin.trim()}
            className="flex items-center gap-2 h-12 px-6 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
          >
            <Search className="h-5 w-5" />
            {isRTL ? "بحث" : "Rechercher"}
          </button>
        </div>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700 font-medium">{error}</p>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      )}

      {candidate && results.length === 0 && !loading && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <p className="text-amber-700 font-medium">
            {isRTL ? "لا توجد نتائج منشورة لهذا المترشح حالياً" : "Aucun résultat publié pour ce candidat pour le moment"}
          </p>
        </div>
      )}

      {candidate && results.length > 0 && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">
              {isRTL ? "معلومات المترشح" : "Informations du candidat"}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">{isRTL ? "الاسم:" : "Nom:"}</span>{" "}
                <span className="font-medium">{candidate.fullName}</span>
              </div>
              <div>
                <span className="text-muted-foreground">{isRTL ? "رقم بطاقة التعريف:" : "CIN:"}</span>{" "}
                <span className="font-medium">{candidate.cin}</span>
              </div>
              <div>
                <span className="text-muted-foreground">{isRTL ? "البريد الإلكتروني:" : "Email:"}</span>{" "}
                <span className="font-medium">{candidate.email}</span>
              </div>
              <div>
                <span className="text-muted-foreground">{isRTL ? "الولاية:" : "Gouvernorat:"}</span>{" "}
                <span className="font-medium">{candidate.governorate}</span>
              </div>
            </div>
          </div>

          {results.map((result) => (
            <div key={result.applicationId} className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-base">
                    {isRTL ? result.jobTitleAr : result.jobTitleFr}
                  </h3>
                  <p className="text-xs text-muted-foreground">{result.jobCode}</p>
                </div>
                <div className="flex items-center gap-2">
                  {result.archived && (
                    <span className="text-xs font-medium rounded-full px-2.5 py-1 bg-slate-200 text-slate-700">
                      {isRTL ? "مؤرشف" : "Archivé"}
                    </span>
                  )}
                  <span className={`text-xs font-medium rounded-full px-2.5 py-1 ${
                    result.status === "FINAL_LIST" ? "bg-teal-100 text-teal-700" :
                    result.status === "APPROVED" ? "bg-green-100 text-green-700" :
                    "bg-amber-100 text-amber-700"
                  }`}>
                    {isRTL ? statusLabels[result.status]?.ar : statusLabels[result.status]?.fr || result.status}
                  </span>
                </div>
              </div>

              <div className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <p className="text-xs text-blue-600 font-medium mb-1">
                      {isRTL ? "نقاط الملف" : "Score dossier"}
                    </p>
                    <p className="text-2xl font-bold text-blue-700">{result.applicationScore.toFixed(2)}</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4 text-center">
                    <p className="text-xs text-purple-600 font-medium mb-1">
                      {isRTL ? "نقاط الشفاهي" : "Score oral"}
                    </p>
                    <p className="text-2xl font-bold text-purple-700">{result.oralTotal.toFixed(2)}</p>
                  </div>
                  <div className="bg-primary/5 rounded-lg p-4 text-center">
                    <p className="text-xs text-primary font-medium mb-1">
                      {isRTL ? "المجموع العام" : "Score total"}
                    </p>
                    <p className="text-2xl font-bold text-primary">{result.totalScore.toFixed(2)}</p>
                  </div>
                </div>

                {result.rank && (
                  <div className="text-center text-sm text-muted-foreground">
                    {isRTL
                      ? `الرتبة: ${result.rank}`
                      : `Classement: ${result.rank === 1 ? "1er" : `${result.rank}ème`}`}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!searched && !loading && (
        <div className="bg-slate-50 rounded-xl border p-12 text-center">
          <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {isRTL
              ? "أدخل رقم بطاقة التعريف الوطنية للبحث عن نتائجك"
              : "Entrez votre numéro CIN pour rechercher vos résultats"}
          </p>
        </div>
      )}
    </div>
  );
}
