"use client";

import { useState, useEffect, useCallback } from "react";
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
  sessions: { id: string }[];
}

interface CalendarEvent {
  id: string;
  name: string | null;
  date: string;
  endDate: string | null;
  startTime: string;
  endTime: string;
  exam: { id: string; titleAr: string; titleFr: string; type: string };
  room: { id: string; name: string } | null;
  type: string;
}

interface Room {
  id: string;
  name: string;
  capacity: number;
  location: string | null;
  equipment: string | null;
  isActive: boolean;
}

const EXAM_TYPE_CFG = {
  WRITTEN: { label: { ar: "تحريري", fr: "Écrit" }, color: "bg-blue-50 text-blue-700" },
  ORAL: { label: { ar: "شفوي", fr: "Oral" }, color: "bg-purple-50 text-purple-700" },
  PRACTICAL: { label: { ar: "تطبيقي", fr: "Pratique" }, color: "bg-amber-50 text-amber-700" },
  SPORTS: { label: { ar: "رياضي", fr: "Sport" }, color: "bg-green-50 text-green-700" },
};

function CalendarTab({
  isRTL, events, exams, rooms, loading, onRefresh,
}: {
  isRTL: boolean;
  events: CalendarEvent[]; exams: Exam[]; rooms: Room[];
  loading: boolean; onRefresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    examId: "", roomId: "", name: "",
    date: "", endDate: "", startTime: "", endTime: "",
    type: "MAIN", maxCandidates: "",
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        examId: form.examId,
        name: form.name || undefined,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        type: form.type,
      };
      if (form.roomId) body.roomId = form.roomId;
      if (form.endDate) body.endDate = form.endDate;
      if (form.maxCandidates) body.maxCandidates = parseInt(form.maxCandidates);

      const res = await fetch(`/api/epreuves/${form.examId}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setShowForm(false);
        setForm({ examId: "", roomId: "", name: "", date: "", endDate: "", startTime: "", endTime: "", type: "MAIN", maxCandidates: "" });
        onRefresh();
      } else {
        const err = await res.json();
        setFormError(err.error || "Erreur");
      }
    } catch {
      setFormError(isRTL ? "فشل الاتصال" : "Erreur de connexion");
    }
    finally { setSaving(false); }
  };

  const deleteSession = async (sessionId: string) => {
    const ok = confirm(isRTL ? "هل أنت متأكد من حذف هذه الجلسة؟" : "Confirmer la suppression de cette session ?");
    if (!ok) return;
    const res = await fetch(`/api/calendar/${sessionId}`, { method: "DELETE" });
    if (res.ok) onRefresh();
    else alert(isRTL ? "فشل الحذف" : "Échec de la suppression");
  };

  const formatDateRange = (ev: CalendarEvent) => {
    const start = new Date(ev.date);
    const end = ev.endDate ? new Date(ev.endDate) : null;
    if (end && end.getTime() !== start.getTime()) {
      return `${start.toLocaleDateString(isRTL ? "ar" : "fr")} - ${end.toLocaleDateString(isRTL ? "ar" : "fr")}`;
    }
    return start.toLocaleDateString(isRTL ? "ar" : "fr");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {events.length} {isRTL ? "الدورة" : "session(s)"}
        </p>
        <button onClick={() => setShowForm(!showForm)}
          className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
          + {isRTL ? "تخطيط الدورة" : "Planifier"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border shadow-sm p-5 mb-4 space-y-4">
          <h3 className="font-bold text-sm">{isRTL ? "تخطيط دورة جديدة" : "Planifier une session"}</h3>
          {formError && <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">{formError}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">{isRTL ? "الامتحان" : "Examen"} *</label>
              <select value={form.examId} onChange={e => setForm({ ...form, examId: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" required>
                <option value="">--</option>
                {exams.map(ex => (
                  <option key={ex.id} value={ex.id}>{isRTL ? ex.titleAr : ex.titleFr}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">{isRTL ? "اسم الدورة" : "Nom session"}</label>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">{isRTL ? "النوع" : "Type"} *</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm">
                <option value="MAIN">{isRTL ? "رئيسية" : "Principale"}</option>
                <option value="RESIT">{isRTL ? "تكميلية" : "Rattrapage"}</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">{isRTL ? "تاريخ البداية" : "Date début"} *</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">{isRTL ? "تاريخ النهاية" : "Date fin"}</label>
              <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">{isRTL ? "وقت البداية" : "Heure début"} *</label>
              <input type="time" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">{isRTL ? "وقت النهاية" : "Heure fin"} *</label>
              <input type="time" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">{isRTL ? "القاعة" : "Salle"}</label>
              <select value={form.roomId} onChange={e => setForm({ ...form, roomId: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm">
                <option value="">--</option>
                {rooms.filter(r => r.isActive).map(r => (
                  <option key={r.id} value={r.id}>{r.name} ({r.capacity})</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">{isRTL ? "الحد الأقصى" : "Max candidats"}</label>
              <input type="number" min={1} value={form.maxCandidates} onChange={e => setForm({ ...form, maxCandidates: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving}
              className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              {saving ? "..." : isRTL ? "حفظ" : "Enregistrer"}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-1.5 border rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
              {isRTL ? "إلغاء" : "Annuler"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : events.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center shadow-sm">
          <p className="text-muted-foreground">
            {isRTL ? "لا توجد دورات مجدولة" : "Aucune session planifiée"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((ev) => {
            const tc = EXAM_TYPE_CFG[ev.exam.type as keyof typeof EXAM_TYPE_CFG] || EXAM_TYPE_CFG.WRITTEN;
            return (
              <div key={ev.id} className="bg-white rounded-xl border shadow-sm p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {ev.name || (isRTL ? ev.exam.titleAr : ev.exam.titleFr)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDateRange(ev)} · {ev.startTime} - {ev.endTime}
                    {ev.room && ` · ${ev.room.name}`}
                  </div>
                </div>
                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${tc.color}`}>
                  {ev.type === "MAIN" ? (isRTL ? "رئيسية" : "Principale") : (isRTL ? "تكميلية" : "Rattrapage")}
                </span>
                <button onClick={() => deleteSession(ev.id)}
                  className="text-xs text-destructive hover:underline cursor-pointer shrink-0">
                  {isRTL ? "حذف" : "Supprimer"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AdminEpreuvesPage() {
  const [locale, setLocale] = useState("fr");
  const [activeTab, setActiveTab] = useState<"exams" | "calendar" | "rooms" | "scoring">("exams");

  const [exams, setExams] = useState<Exam[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const segments = window.location.pathname.split("/");
    setLocale(segments[1] || "fr");
  }, []);

  const fetchExams = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/epreuves");
      if (res.ok) setExams(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    try {
      var start = new Date(); start.setMonth(start.getMonth() - 6);
      var end = new Date(); end.setMonth(end.getMonth() + 6);
      const res = await fetch(`/api/calendar?start=${start.toISOString()}&end=${end.toISOString()}`);
      if (res.ok) setEvents(await res.json());
      else console.error("Calendar fetch error:", await res.text());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/rooms");
      if (res.ok) setRooms(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  const deleteExam = async (id: string) => {
    const ok = confirm(isRTL ? "هل أنت متأكد من الحذف؟" : "Confirmer la suppression ?");
    if (!ok) return;
    const res = await fetch(`/api/epreuves/${id}`, { method: "DELETE" });
    if (res.ok) fetchExams();
    else alert(isRTL ? "فشل الحذف" : "Échec de la suppression");
  };

  const deleteRoom = async (id: string) => {
    const ok = confirm(isRTL ? "هل أنت متأكد من حذف هذه القاعة؟" : "Confirmer la suppression de cette salle ?");
    if (!ok) return;
    const res = await fetch(`/api/rooms/${id}`, { method: "DELETE" });
    if (res.ok) fetchRooms();
    else alert(isRTL ? "فشل الحذف" : "Échec de la suppression");
  };

  useEffect(() => {
    if (activeTab === "exams") fetchExams();
    else if (activeTab === "calendar") { fetchCalendar(); fetchRooms(); }
    else if (activeTab === "rooms") fetchRooms();
  }, [activeTab, fetchExams, fetchCalendar, fetchRooms]);

  const isRTL = locale === "ar";

  const tabs = [
    { key: "exams", label: { ar: "امتحانات", fr: "Examens" } },
    { key: "calendar", label: { ar: "الروزنامة", fr: "Calendrier" } },
    { key: "rooms", label: { ar: "القاعات", fr: "Salles" } },
    { key: "scoring", label: { ar: "التقييم", fr: "Notation" } },
  ] as const;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{isRTL ? "إدارة الامتحانات" : "Gestion des épreuves"}</h1>
        <Link href={`/${locale}/admin/epreuves/new`}>
          <span className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium cursor-pointer">
            + {isRTL ? "امتحان جديد" : "Nouvel examen"}
          </span>
        </Link>
      </div>

      <div className="flex gap-1 mb-6 bg-slate-100 rounded-lg p-1 w-fit flex-wrap">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key as typeof activeTab)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeTab === t.key
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}>
            {isRTL ? t.label.ar : t.label.fr}
          </button>
        ))}
      </div>

      {activeTab === "exams" && (
        <div>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : exams.length === 0 ? (
            <div className="bg-white rounded-xl border p-12 text-center shadow-sm">
              <p className="text-muted-foreground mb-4">
                {isRTL ? "لا توجد امتحانات بعد" : "Aucun examen"}
              </p>
              <Link href={`/${locale}/admin/epreuves/new`}>
                <span className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium cursor-pointer">
                  {isRTL ? "إنشاء امتحان" : "Créer un examen"}
                </span>
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-slate-50 text-sm">
                    <th className="text-right p-3 font-medium">{isRTL ? "العنوان" : "Titre"}</th>
                    <th className="text-center p-3 font-medium">{isRTL ? "النوع" : "Type"}</th>
                    <th className="text-center p-3 font-medium">{isRTL ? "المعدل على" : "Coef."}</th>
                    <th className="text-right p-3 font-medium hidden md:table-cell">{isRTL ? "المناظرة" : "Poste"}</th>
                    <th className="text-center p-3 font-medium hidden md:table-cell">{isRTL ? "الدورة" : "Sessions"}</th>
                    <th className="text-center p-3 font-medium">{isRTL ? "إجراءات" : "Actions"}</th>
                  </tr>
                </thead>
                <tbody>
                  {exams.map((exam) => {
                    const tc = EXAM_TYPE_CFG[exam.type];
                    return (
                      <tr key={exam.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                        <td className="p-3 text-sm font-medium">
                          <div>{isRTL ? exam.titleAr : exam.titleFr}</div>
                          <div className="text-xs text-muted-foreground">{isRTL ? exam.titleFr : exam.titleAr}</div>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${tc.color}`}>
                            {isRTL ? tc.label.ar : tc.label.fr}
                          </span>
                        </td>
                        <td className="p-3 text-center text-sm font-mono">{exam.coefficient}</td>
                        <td className="p-3 text-sm text-muted-foreground hidden md:table-cell">
                          {isRTL ? exam.job.titleAr : exam.job.titleFr}
                        </td>
                        <td className="p-3 text-center text-sm hidden md:table-cell">{exam.sessions.length}</td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link href={`/${locale}/admin/epreuves/${exam.id}`}>
                              <span className="text-xs text-primary hover:underline cursor-pointer">
                                {isRTL ? "عرض" : "Voir"}
                              </span>
                            </Link>
                            <Link href={`/${locale}/admin/epreuves/${exam.id}/edit`}>
                              <span className="text-xs text-primary hover:underline cursor-pointer">
                                {isRTL ? "تعديل" : "Modifier"}
                              </span>
                            </Link>
                            <button onClick={() => deleteExam(exam.id)}
                              className="text-xs text-destructive hover:underline cursor-pointer">
                              {isRTL ? "حذف" : "Supprimer"}
                            </button>
                          </div>
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

      {activeTab === "calendar" && (
        <CalendarTab
          isRTL={isRTL}
          events={events}
          exams={exams}
          rooms={rooms}
          loading={loading}
          onRefresh={fetchCalendar}
        />
      )}

      {activeTab === "rooms" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {rooms.length} {isRTL ? "قاعة" : "salle(s)"}
            </p>
            <Link href={`/${locale}/admin/epreuves/rooms`}>
              <span className="px-4 py-1.5 border rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors cursor-pointer">
                {isRTL ? "إدارة القاعات" : "Gérer les salles"}
              </span>
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-slate-50 text-sm">
                    <th className="text-right p-3 font-medium">{isRTL ? "الاسم" : "Nom"}</th>
                    <th className="text-center p-3 font-medium">{isRTL ? "السعة" : "Capacité"}</th>
                    <th className="text-right p-3 font-medium hidden md:table-cell">{isRTL ? "الموقع" : "Lieu"}</th>
                    <th className="text-right p-3 font-medium hidden lg:table-cell">{isRTL ? "التجهيزات" : "Équipement"}</th>
                    <th className="text-center p-3 font-medium">{isRTL ? "الحالة" : "Statut"}</th>
                    <th className="text-center p-3 font-medium">{isRTL ? "إجراءات" : "Actions"}</th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.map((room) => (
                    <tr key={room.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                      <td className="p-3 text-sm font-medium">{room.name}</td>
                      <td className="p-3 text-center text-sm font-mono">{room.capacity}</td>
                      <td className="p-3 text-sm text-muted-foreground hidden md:table-cell">{room.location || "-"}</td>
                      <td className="p-3 text-sm text-muted-foreground hidden lg:table-cell">{room.equipment || "-"}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                          room.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                        }`}>
                          {room.isActive
                            ? (isRTL ? "نشطة" : "Active")
                            : (isRTL ? "غير نشطة" : "Inactive")}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <button onClick={() => deleteRoom(room.id)}
                          className="text-xs text-destructive hover:underline cursor-pointer">
                          {isRTL ? "حذف" : "Supprimer"}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {rooms.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-muted-foreground">
                        {isRTL ? "لا توجد قاعات" : "Aucune salle"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "scoring" && (
        <div>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : exams.length === 0 ? (
            <div className="bg-white rounded-xl border p-12 text-center shadow-sm">
              <p className="text-muted-foreground">
                {isRTL ? "لا توجد امتحانات للتقيم" : "Aucun examen à noter"}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-slate-50 text-sm">
                    <th className="text-right p-3 font-medium">{isRTL ? "الامتحان" : "Examen"}</th>
                    <th className="text-center p-3 font-medium">{isRTL ? "النوع" : "Type"}</th>
                    <th className="text-center p-3 font-medium">{isRTL ? "النتائج" : "Résultats"}</th>
                    <th className="text-center p-3 font-medium">{isRTL ? "الحالة" : "Statut"}</th>
                    <th className="text-right p-3 font-medium">{isRTL ? "إجراءات" : "Actions"}</th>
                  </tr>
                </thead>
                <tbody>
                  {exams.map((exam) => {
                    const tc = EXAM_TYPE_CFG[exam.type];
                    return (
                      <tr key={exam.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                        <td className="p-3 text-sm font-medium">
                          <div>{isRTL ? exam.titleAr : exam.titleFr}</div>
                          <div className="text-xs text-muted-foreground">{isRTL ? exam.titleFr : exam.titleAr}</div>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${tc.color}`}>
                            {isRTL ? tc.label.ar : tc.label.fr}
                          </span>
                        </td>
                        <td className="p-3 text-center text-sm">
                          {exam.sessions.length > 0 ? (
                            <span className="font-mono">{exam.sessions.length} session(s)</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                            exam.sessions.length > 0 ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                          }`}>
                            {exam.sessions.length > 0
                              ? (isRTL ? "مجدول" : "Planifié")
                              : (isRTL ? "بدون جلسات" : "Sans session")}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <Link href={`/${locale}/admin/epreuves/${exam.id}`}>
                            <span className="text-xs text-primary hover:underline cursor-pointer">
                              {isRTL ? "التقييم" : "Noter"}
                            </span>
                          </Link>
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
    </div>
  );
}
