"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Exam {
  id: string;
  titleAr: string;
  titleFr: string;
  type: "WRITTEN" | "ORAL" | "PRACTICAL" | "SPORTS";
  coefficient: number;
  duration: number | null;
  description: string | null;
  job: { id: string; titleAr: string; titleFr: string };
}

interface Session {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  type: "MAIN" | "RESIT";
  room: { id: string; name: string } | null;
}

interface Room {
  id: string;
  name: string;
  capacity: number;
}

interface Candidate {
  id: string;
  fullName: string;
  cin: string;
  status: string;
}

interface ExamResult {
  candidateId: string;
  score: number | null;
  present: boolean;
}

type SectionTab = "sessions" | "candidates" | "scoring";

const EXAM_TYPE_CFG: Record<string, { label: { ar: string; fr: string }; color: string }> = {
  WRITTEN: { label: { ar: "تحريري", fr: "Écrit" }, color: "bg-blue-50 text-blue-700" },
  ORAL: { label: { ar: "شفوي", fr: "Oral" }, color: "bg-purple-50 text-purple-700" },
  PRACTICAL: { label: { ar: "تطبيقي", fr: "Pratique" }, color: "bg-amber-50 text-amber-700" },
  SPORTS: { label: { ar: "رياضي", fr: "Sport" }, color: "bg-green-50 text-green-700" },
};

export default function ExamDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [locale, setLocale] = useState("fr");
  const [activeSection, setActiveSection] = useState<SectionTab>("sessions");

  const [exam, setExam] = useState<Exam | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [results, setResults] = useState<Record<string, ExamResult>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showSessionForm, setShowSessionForm] = useState(false);
  const [sessionForm, setSessionForm] = useState({
    date: "",
    startTime: "",
    endTime: "",
    roomId: "",
    type: "MAIN",
  });
  const [sessionError, setSessionError] = useState("");

  const [scoreInputs, setScoreInputs] = useState<Record<string, string>>({});
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [scoringError, setScoringError] = useState("");

  useEffect(() => {
    const segments = window.location.pathname.split("/");
    setLocale(segments[1] || "fr");
  }, []);

  const fetchExam = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [examRes, sessionsRes, roomsRes, candidatesRes] = await Promise.all([
        fetch(`/api/epreuves/${id}`),
        fetch(`/api/epreuves/${id}/sessions`),
        fetch("/api/rooms"),
        fetch(`/api/epreuves/${id}/candidates`),
      ]);

      if (examRes.ok) setExam(await examRes.json());
      if (sessionsRes.ok) setSessions(await sessionsRes.json());
      if (roomsRes.ok) setRooms(await roomsRes.json());
      if (candidatesRes.ok) setCandidates(await candidatesRes.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchExam(); }, [fetchExam]);

  const createSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setSessionError("");
    try {
      const res = await fetch(`/api/epreuves/${id}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: sessionForm.date,
          startTime: sessionForm.startTime,
          endTime: sessionForm.endTime,
          roomId: sessionForm.roomId || null,
          type: sessionForm.type,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setSessions((prev) => [...prev, created]);
        setShowSessionForm(false);
        setSessionForm({ date: "", startTime: "", endTime: "", roomId: "", type: "MAIN" });
      } else {
        const data = await res.json().catch(() => ({}));
        setSessionError(data.error || (isRTL ? "خطأ" : "Erreur"));
      }
    } catch {
      setSessionError(isRTL ? "خطأ في الاتصال" : "Erreur de connexion");
    }
  };

  const deleteSession = async (sessionId: string) => {
    const ok = confirm(isRTL ? "هل أنت متأكد من حذف هذه الجلسة؟" : "Confirmer la suppression de cette session ?");
    if (!ok) return;
    const res = await fetch(`/api/calendar/${sessionId}`, { method: "DELETE" });
    if (res.ok) setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    else alert(isRTL ? "فشل الحذف" : "Échec de la suppression");
  };

  const submitScores = async () => {
    if (!selectedSessionId) {
      setScoringError(isRTL ? "اختر جلسة أولاً" : "Sélectionnez une session");
      return;
    }
    setSaving(true);
    setScoringError("");
    try {
      const scores = Object.entries(scoreInputs).map(([candidateId, value]) => ({
        candidateId,
        score: value ? parseFloat(value) : null,
        present: results[candidateId]?.present ?? true,
      }));

      const res = await fetch(`/api/epreuves/${id}/results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: selectedSessionId, scores }),
      });

      if (res.ok) {
        const updated = await res.json();
        const map: Record<string, ExamResult> = {};
        for (const r of updated) map[r.candidateId] = r;
        setResults(map);
      } else {
        const data = await res.json().catch(() => ({}));
        setScoringError(data.error || (isRTL ? "خطأ" : "Erreur"));
      }
    } catch {
      setScoringError(isRTL ? "خطأ في الاتصال" : "Erreur de connexion");
    } finally {
      setSaving(false);
    }
  };

  const isRTL = locale === "ar";

  const sessionTypeLabel = (t: string) =>
    t === "MAIN"
      ? (isRTL ? "رئيسية" : "Principale")
      : (isRTL ? "تعويضية" : "Rattrapage");

  if (loading && !exam) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="bg-white rounded-xl border p-12 text-center shadow-sm">
        <p className="text-muted-foreground">
          {isRTL ? "الامتحان غير موجود" : "Examen introuvable"}
        </p>
        <Link href={`/${locale}/admin/epreuves`} className="text-primary text-sm hover:underline mt-2 inline-block">
          {isRTL ? "العودة إلى القائمة" : "Retour à la liste"}
        </Link>
      </div>
    );
  }

  const tc = EXAM_TYPE_CFG[exam.type];
  const availableRooms = rooms.filter((r) => r.capacity > 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href={`/${locale}/admin/epreuves`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {isRTL ? "الامتحانات" : "Examens"}
            </Link>
            <span className="text-muted-foreground">/</span>
          </div>
          <h1 className="text-2xl font-bold">
            {isRTL ? exam.titleAr : exam.titleFr}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isRTL ? exam.titleFr : exam.titleAr}
          </p>
        </div>
        <Link href={`/${locale}/admin/epreuves/${id}/edit`}>
          <span className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors cursor-pointer">
            {isRTL ? "تعديل" : "Modifier"}
          </span>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border shadow-sm p-4">
          <div className="text-xs text-muted-foreground mb-1">{isRTL ? "النوع" : "Type"}</div>
          <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${tc.color}`}>
            {isRTL ? tc.label.ar : tc.label.fr}
          </span>
        </div>
        <div className="bg-white rounded-xl border shadow-sm p-4">
          <div className="text-xs text-muted-foreground mb-1">{isRTL ? "المعدل/*" : "Coefficient"}</div>
          <div className="text-lg font-bold">{exam.coefficient}</div>
        </div>
        <div className="bg-white rounded-xl border shadow-sm p-4">
          <div className="text-xs text-muted-foreground mb-1">{isRTL ? "المدة" : "Durée"}</div>
          <div className="text-lg font-bold">{exam.duration ? `${exam.duration} min` : "-"}</div>
        </div>
        <div className="bg-white rounded-xl border shadow-sm p-4">
          <div className="text-xs text-muted-foreground mb-1">{isRTL ? "المناظرة" : "Poste"}</div>
          <div className="text-sm font-medium">{isRTL ? exam.job.titleAr : exam.job.titleFr}</div>
        </div>
      </div>

      {exam.description && (
        <div className="bg-white rounded-xl border shadow-sm p-4 mb-6">
          <div className="text-xs text-muted-foreground mb-1">{isRTL ? "الوصف" : "Description"}</div>
          <p className="text-sm">{exam.description}</p>
        </div>
      )}

      <div className="flex gap-1 mb-6 bg-slate-100 rounded-lg p-1 w-fit flex-wrap">
        {(["sessions", "candidates", "scoring"] as const).map((s) => (
          <button key={s} onClick={() => setActiveSection(s)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeSection === s
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}>
            {s === "sessions"
              ? (isRTL ? "الإمتحان" : "Sessions")
              : s === "candidates"
                ? (isRTL ? "المترشحين" : "Candidats")
                : (isRTL ? "التقييم" : "Notation")}
          </button>
        ))}
      </div>

      {activeSection === "sessions" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              {isRTL ? "الدورات" : "Sessions"}
              <span className="text-sm font-normal text-muted-foreground ml-2">({sessions.length})</span>
            </h2>
            <button onClick={() => setShowSessionForm(true)}
              className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
              + {isRTL ? "إضافة إمتحان" : "Ajouter session"}
            </button>
          </div>

          {showSessionForm && (
            <form onSubmit={createSession} className="bg-white rounded-xl border shadow-sm p-4 mb-4 space-y-3">
              <h3 className="text-sm font-medium">{isRTL ? "دورة جديدة" : "Nouvelle session"}</h3>
              {sessionError && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-2 text-xs text-destructive">
                  {sessionError}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">{isRTL ? "التاريخ" : "Date"} *</label>
                  <input type="date" value={sessionForm.date} required
                    onChange={(e) => setSessionForm((p) => ({ ...p, date: e.target.value }))}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">{isRTL ? "بداية" : "Début"} *</label>
                  <input type="time" value={sessionForm.startTime} required
                    onChange={(e) => setSessionForm((p) => ({ ...p, startTime: e.target.value }))}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">{isRTL ? "نهاية" : "Fin"} *</label>
                  <input type="time" value={sessionForm.endTime} required
                    onChange={(e) => setSessionForm((p) => ({ ...p, endTime: e.target.value }))}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">{isRTL ? "القاعة" : "Salle"}</label>
                  <select value={sessionForm.roomId}
                    onChange={(e) => setSessionForm((p) => ({ ...p, roomId: e.target.value }))}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
                    <option value="">{isRTL ? "اختر" : "Sélectionner"}</option>
                    {availableRooms.map((r) => (
                      <option key={r.id} value={r.id}>{r.name} ({r.capacity})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">{isRTL ? "النوع" : "Type"}</label>
                  <select value={sessionForm.type}
                    onChange={(e) => setSessionForm((p) => ({ ...p, type: e.target.value }))}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
                    <option value="MAIN">{isRTL ? "رئيسية" : "Principale"}</option>
                    <option value="RESIT">{isRTL ? "تعويضية" : "Rattrapage"}</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button type="submit"
                  className="px-4 h-9 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                  {isRTL ? "حفظ" : "Enregistrer"}
                </button>
                <button type="button" onClick={() => setShowSessionForm(false)}
                  className="px-4 h-9 border rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
                  {isRTL ? "إلغاء" : "Annuler"}
                </button>
              </div>
            </form>
          )}

          {sessions.length === 0 ? (
            <div className="bg-white rounded-xl border p-12 text-center shadow-sm">
              <p className="text-muted-foreground">
                {isRTL ? "لا توجد جلسات بعد" : "Aucune session"}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-slate-50 text-sm">
                    <th className="text-right p-3 font-medium">{isRTL ? "التاريخ" : "Date"}</th>
                    <th className="text-right p-3 font-medium">{isRTL ? "الوقت" : "Horaire"}</th>
                    <th className="text-right p-3 font-medium">{isRTL ? "القاعة" : "Salle"}</th>
                    <th className="text-center p-3 font-medium">{isRTL ? "النوع" : "Type"}</th>
                    <th className="text-center p-3 font-medium">{isRTL ? "إجراءات" : "Actions"}</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => {
                    const d = new Date(s.date);
                    return (
                      <tr key={s.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                        <td className="p-3 text-sm">
                          {d.toLocaleDateString(isRTL ? "ar" : "fr", {
                            day: "numeric", month: "long", year: "numeric",
                          })}
                        </td>
                        <td className="p-3 text-sm font-mono">
                          {s.startTime} - {s.endTime}
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {s.room?.name || "-"}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                            s.type === "MAIN" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"
                          }`}>
                            {sessionTypeLabel(s.type)}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <button onClick={() => deleteSession(s.id)}
                            className="text-xs text-destructive hover:underline cursor-pointer">
                            {isRTL ? "حذف" : "Supprimer"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeSection === "candidates" && (
        <div>
          <h2 className="text-lg font-semibold mb-4">
            {isRTL ? "المترشحين" : "Candidats"}
            <span className="text-sm font-normal text-muted-foreground ml-2">({candidates.length})</span>
          </h2>

          {loading && candidates.length === 0 ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : candidates.length === 0 ? (
            <div className="bg-white rounded-xl border p-12 text-center shadow-sm">
              <p className="text-muted-foreground">
                {isRTL ? "لا يوجد مرشحون لهذا الامتحان" : "Aucun candidat pour cet examen"}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-slate-50 text-sm">
                    <th className="p-3 w-10"></th>
                    <th className="text-left p-3 font-medium">{isRTL ? "الاسم الكامل" : "Nom complet"}</th>
                    <th className="text-left p-3 font-medium">CIN</th>
                    <th className="text-center p-3 font-medium">{isRTL ? "الحالة" : "Statut"}</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((c) => (
                    <tr key={c.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                      <td className="p-3 text-center">
                        <input type="checkbox"
                          checked={results[c.id]?.present ?? true}
                          onChange={() =>
                            setResults((prev) => ({
                              ...prev,
                              [c.id]: {
                                candidateId: c.id,
                                score: prev[c.id]?.score ?? null,
                                present: !(prev[c.id]?.present ?? true),
                              },
                            }))
                          }
                          className="rounded" />
                      </td>
                      <td className="p-3 text-sm font-medium">{c.fullName}</td>
                      <td className="p-3 text-sm font-mono">{c.cin}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                          results[c.id]?.present ?? true
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-700"
                        }`}>
                          {(results[c.id]?.present ?? true)
                            ? (isRTL ? "حاضر" : "Présent")
                            : (isRTL ? "غائب" : "Absent")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeSection === "scoring" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              {isRTL ? "التقييم" : "Notation"}
            </h2>
            <div className="flex items-center gap-2">
              <select value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                <option value="">{isRTL ? "اختر جلسة" : "Choisir session"}</option>
                {sessions.map((s) => {
                  const d = new Date(s.date);
                  return (
                    <option key={s.id} value={s.id}>
                      {d.toLocaleDateString(isRTL ? "ar" : "fr")} {s.startTime} - {s.type}
                    </option>
                  );
                })}
              </select>
              <button onClick={submitScores} disabled={saving || !selectedSessionId}
                className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                {saving
                  ? (isRTL ? "جاري الحفظ..." : "Enregistrement...")
                  : (isRTL ? "حفظ النتائج" : "Enregistrer notes")}
              </button>
            </div>
          </div>

          {scoringError && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive mb-4">
              {scoringError}
            </div>
          )}

          {!selectedSessionId ? (
            <div className="bg-white rounded-xl border p-12 text-center shadow-sm">
              <p className="text-muted-foreground">
                {isRTL ? "اختر جلسة لبدء التقييم" : "Sélectionnez une session pour noter"}
              </p>
            </div>
          ) : candidates.length === 0 ? (
            <div className="bg-white rounded-xl border p-12 text-center shadow-sm">
              <p className="text-muted-foreground">
                {isRTL ? "لا يوجد مرشحون" : "Aucun candidat"}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-slate-50 text-sm">
                    <th className="text-left p-3 font-medium">{isRTL ? "المرشح" : "Candidat"}</th>
                    <th className="text-left p-3 font-medium">{isRTL ? "بطاقة التعريف" : "CIN"}</th>
                    <th className="text-center p-3 font-medium">{isRTL ? "الدرجة" : "Note"}</th>
                    <th className="text-center p-3 font-medium">{isRTL ? "الحضور" : "Présence"}</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((c) => (
                    <tr key={c.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                      <td className="p-3 text-sm font-medium">{c.fullName}</td>
                      <td className="p-3 text-sm font-mono">{c.cin}</td>
                      <td className="p-3 text-center">
                        <input type="number" min="0" max="20" step="0.5"
                          value={scoreInputs[c.id] ?? ""}
                          onChange={(e) =>
                            setScoreInputs((prev) => ({ ...prev, [c.id]: e.target.value }))
                          }
                          className="w-20 h-9 rounded border border-input bg-background px-2 text-sm text-center"
                          placeholder="0-20" />
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                          results[c.id]?.present ?? true
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-700"
                        }`}>
                          {(results[c.id]?.present ?? true)
                            ? (isRTL ? "حاضر" : "Présent")
                            : (isRTL ? "غائب" : "Absent")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
