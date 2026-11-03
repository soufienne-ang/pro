"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Room {
  id: string;
  name: string;
  capacity: number;
  location: string | null;
  equipment: string | null;
  isActive: boolean;
}

export default function RoomsPage() {
  const [locale, setLocale] = useState("fr");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    capacity: "30",
    location: "",
    equipment: "",
    isActive: true,
  });

  useEffect(() => {
    const segments = window.location.pathname.split("/");
    setLocale(segments[1] || "fr");
  }, []);

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/rooms");
      if (res.ok) setRooms(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  const openAdd = () => {
    setEditingId(null);
    setForm({ name: "", capacity: "30", location: "", equipment: "", isActive: true });
    setError("");
    setShowModal(true);
  };

  const openEdit = (room: Room) => {
    setEditingId(room.id);
    setForm({
      name: room.name,
      capacity: String(room.capacity),
      location: room.location || "",
      equipment: room.equipment || "",
      isActive: room.isActive,
    });
    setError("");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const payload = {
        name: form.name,
        capacity: parseInt(form.capacity, 10),
        location: form.location || null,
        equipment: form.equipment || null,
        isActive: form.isActive,
      };

      let res: Response;
      if (editingId) {
        res = await fetch(`/api/rooms/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/rooms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        setShowModal(false);
        fetchRooms();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || (isRTL ? "خطأ" : "Erreur"));
      }
    } catch {
      setError(isRTL ? "خطأ في الاتصال" : "Erreur de connexion");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (room: Room) => {
    try {
      const res = await fetch(`/api/rooms/${room.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !room.isActive }),
      });
      if (res.ok) fetchRooms();
    } catch (e) { console.error(e); }
  };

  const deleteRoom = async (id: string) => {
    const ok = confirm(isRTL ? "هل أنت متأكد من الحذف؟" : "Confirmer la suppression ?");
    if (!ok) return;
    try {
      const res = await fetch(`/api/rooms/${id}`, { method: "DELETE" });
      if (res.ok) fetchRooms();
    } catch (e) { console.error(e); }
  };

  const isRTL = locale === "ar";

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
          <h1 className="text-2xl font-bold">{isRTL ? "إدارة القاعات" : "Gestion des salles"}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {rooms.length} {isRTL ? "قاعة مسجلة" : "salle(s) enregistrée(s)"}
          </p>
        </div>
        <button onClick={openAdd}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium">
          + {isRTL ? "إضافة قاعة" : "Ajouter salle"}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : rooms.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center shadow-sm">
          <p className="text-muted-foreground mb-4">
            {isRTL ? "لا توجد قاعات بعد" : "Aucune salle"}
          </p>
          <button onClick={openAdd}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">
            {isRTL ? "إضافة أول قاعة" : "Ajouter une salle"}
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-slate-50 text-sm">
                <th className="text-right p-3 font-medium">{isRTL ? "الاسم" : "Nom"}</th>
                <th className="text-right p-3 font-medium">{isRTL ? "السعة" : "Capacité"}</th>
                <th className="text-right p-3 font-medium hidden md:table-cell">{isRTL ? "الموقع" : "Lieu"}</th>
                <th className="text-right p-3 font-medium hidden lg:table-cell">{isRTL ? "التجهيزات" : "Équipement"}</th>
                <th className="text-center p-3 font-medium">{isRTL ? "الحالة" : "Statut"}</th>
                <th className="text-right p-3 font-medium">{isRTL ? "إجراءات" : "Actions"}</th>
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
                    <button onClick={() => toggleActive(room)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-full cursor-pointer transition-colors ${
                        room.isActive
                          ? "bg-green-50 text-green-700 hover:bg-green-100"
                          : "bg-red-50 text-red-700 hover:bg-red-100"
                      }`}>
                      {room.isActive
                        ? (isRTL ? "نشطة" : "Active")
                        : (isRTL ? "غير نشطة" : "Inactive")}
                    </button>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(room)}
                        className="text-xs text-primary hover:underline cursor-pointer">
                        {isRTL ? "تعديل" : "Modifier"}
                      </button>
                      <button onClick={() => deleteRoom(room.id)}
                        className="text-xs text-destructive hover:underline cursor-pointer">
                        {isRTL ? "حذف" : "Supprimer"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6">
            <h2 className="text-lg font-semibold mb-4">
              {editingId
                ? (isRTL ? "تعديل القاعة" : "Modifier la salle")
                : (isRTL ? "إضافة قاعة جديدة" : "Nouvelle salle")}
            </h2>

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{isRTL ? "الاسم" : "Nom"} *</label>
                <input type="text" value={form.name} required
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{isRTL ? "السعة" : "Capacité"} *</label>
                <input type="number" value={form.capacity} min="1" required
                  onChange={(e) => setForm((p) => ({ ...p, capacity: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{isRTL ? "الموقع" : "Lieu"}</label>
                <input type="text" value={form.location}
                  onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{isRTL ? "التجهيزات" : "Équipement"}</label>
                <input type="text" value={form.equipment}
                  onChange={(e) => setForm((p) => ({ ...p, equipment: e.target.value }))}
                  placeholder={isRTL ? "مثال: طاولات، كراسي، سبورة" : "Ex: tables, chaises, tableau"}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isActive" checked={form.isActive}
                  onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                  className="rounded" />
                <label htmlFor="isActive" className="text-sm">
                  {isRTL ? "نشطة" : "Active"}
                </label>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button type="submit" disabled={saving}
                  className="px-6 h-10 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {saving
                    ? (isRTL ? "جاري الحفظ..." : "Enregistrement...")
                    : (isRTL ? "حفظ" : "Enregistrer")}
                </button>
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-6 h-10 border rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
                  {isRTL ? "إلغاء" : "Annuler"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
