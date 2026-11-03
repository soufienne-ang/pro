"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
}

var ROLE_OPTIONS = [
  { value: "SUPER_ADMIN", labelFr: "Super Admin", labelAr: "مدير النظام" },
  { value: "HR_AGENT", labelFr: "Agent RH", labelAr: "عون موارد بشرية" },
  { value: "COMMISSION", labelFr: "Commission", labelAr: "اللجنة" },
  { value: "JURY_MEMBER", labelFr: "Membre du Jury", labelAr: "عضو لجنة التحكيم" },
  { value: "REVIEWER", labelFr: "Évaluateur", labelAr: "مُقيِّم" },
];

var ROLE_BADGES: Record<string, string> = {
  SUPER_ADMIN: "bg-purple-100 text-purple-800",
  HR_AGENT: "bg-blue-100 text-blue-800",
  COMMISSION: "bg-green-100 text-green-800",
  JURY_MEMBER: "bg-amber-100 text-amber-800",
  REVIEWER: "bg-slate-100 text-slate-700",
};

export default function UsersPage() {
  var [locale, setLocale] = useState("fr");
  var [users, setUsers] = useState<AdminUser[]>([]);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState("");
  var [showModal, setShowModal] = useState(false);
  var [editUser, setEditUser] = useState<AdminUser | null>(null);
  var [form, setForm] = useState({ email: "", password: "", name: "", role: "REVIEWER" });
  var [saving, setSaving] = useState(false);
  var [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  var isRTL = locale === "ar";

  useEffect(function () {
    var segments = window.location.pathname.split("/");
    setLocale(segments[1] || "fr");
  }, []);

  var fetchUsers = useCallback(async function () {
    setLoading(true);
    try {
      var res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to fetch");
      var data = await res.json();
      setUsers(data);
    } catch {
      setError(isRTL ? "خطأ في تحميل المستخدمين" : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [isRTL]);

  useEffect(function () { fetchUsers(); }, [fetchUsers]);

  async function handleCreate() {
    setSaving(true);
    try {
      var res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        var err = await res.json();
        alert(err.error || (isRTL ? "خطأ" : "Erreur"));
        return;
      }
      setShowModal(false);
      setForm({ email: "", password: "", name: "", role: "REVIEWER" });
      fetchUsers();
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id: string, data: Partial<AdminUser & { password: string }>) {
    try {
      var res = await fetch("/api/admin/users/" + id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        var err = await res.json();
        alert(err.error || (isRTL ? "خطأ" : "Erreur"));
        return;
      }
      setEditUser(null);
      fetchUsers();
    } catch {
      alert(isRTL ? "خطأ" : "Erreur");
    }
  }

  async function handleDelete(id: string) {
    try {
      var res = await fetch("/api/admin/users/" + id, { method: "DELETE" });
      if (!res.ok) {
        var err = await res.json();
        alert(err.error || (isRTL ? "خطأ" : "Erreur"));
        return;
      }
      setDeleteConfirm(null);
      fetchUsers();
    } catch {
      alert(isRTL ? "خطأ" : "Erreur");
    }
  }

  function formatDate(d: string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString(locale === "ar" ? "ar-TN" : "fr-FR", {
      day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">{isRTL ? "جار التحميل..." : "Chargement..."}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-destructive">{error}</div>
      </div>
    );
  }

  return (
    <div dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{isRTL ? "إدارة المستخدمين" : "Gestion des utilisateurs"}</h1>
        <Button onClick={function () { setShowModal(true); }}>
          {isRTL ? "+ مستخدم جديد" : "+ Nouvel utilisateur"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "المستخدمون" : "Utilisateurs"}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-right p-3 font-medium">{isRTL ? "الاسم" : "Nom"}</th>
                  <th className="text-right p-3 font-medium">{isRTL ? "البريد الإلكتروني" : "Email"}</th>
                  <th className="text-right p-3 font-medium">{isRTL ? "الدور" : "Rôle"}</th>
                  <th className="text-right p-3 font-medium">{isRTL ? "الحالة" : "Statut"}</th>
                  <th className="text-right p-3 font-medium">{isRTL ? "آخر دخول" : "Dernière connexion"}</th>
                  <th className="text-right p-3 font-medium">{isRTL ? "الإجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody>
                {users.map(function (u) {
                  return (
                    <tr key={u.id} className="border-b hover:bg-slate-50">
                      <td className="p-3 font-medium">{u.name}</td>
                      <td className="p-3 text-muted-foreground">{u.email}</td>
                      <td className="p-3">
                        <span className={"text-xs px-2 py-1 rounded font-medium " + (ROLE_BADGES[u.role] || "")}>
                          {isRTL
                            ? (ROLE_OPTIONS.find(function (r) { return r.value === u.role; })?.labelAr || u.role)
                            : (ROLE_OPTIONS.find(function (r) { return r.value === u.role; })?.labelFr || u.role)}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={"text-xs px-2 py-1 rounded font-medium " + (u.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                          {u.isActive ? (isRTL ? "نشط" : "Actif") : (isRTL ? "غير نشط" : "Inactif")}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground text-xs">{formatDate(u.lastLogin)}</td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={function () { setEditUser(u); setForm({ email: u.email, password: "", name: u.name, role: u.role }); }}>
                            {isRTL ? "تعديل" : "Modifier"}
                          </Button>
                          <Button
                            variant={u.isActive ? "secondary" : "default"}
                            size="sm"
                            onClick={async function () { await handleUpdate(u.id, { isActive: !u.isActive }); }}
                          >
                            {u.isActive ? (isRTL ? "تعطيل" : "Désactiver") : (isRTL ? "تفعيل" : "Activer")}
                          </Button>
                          <Button variant="destructive" size="sm" onClick={function () { setDeleteConfirm(u.id); }}>
                            {isRTL ? "حذف" : "Supprimer"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold mb-4">{isRTL ? "مستخدم جديد" : "Nouvel utilisateur"}</h2>
            <div className="space-y-4">
              <div>
                <Label>{isRTL ? "الاسم" : "Nom"}</Label>
                <Input value={form.name} onChange={function (e) { setForm({ ...form, name: e.target.value }); }} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={function (e) { setForm({ ...form, email: e.target.value }); }} />
              </div>
              <div>
                <Label>{isRTL ? "كلمة المرور" : "Mot de passe"}</Label>
                <Input type="password" value={form.password} onChange={function (e) { setForm({ ...form, password: e.target.value }); }} />
              </div>
              <div>
                <Label>{isRTL ? "الدور" : "Rôle"}</Label>
                <select
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={form.role}
                  onChange={function (e) { setForm({ ...form, role: e.target.value }); }}
                >
                  {ROLE_OPTIONS.map(function (r) {
                    return <option key={r.value} value={r.value}>{isRTL ? r.labelAr : r.labelFr}</option>;
                  })}
                </select>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <Button variant="outline" onClick={function () { setShowModal(false); }} disabled={saving}>
                  {isRTL ? "إلغاء" : "Annuler"}
                </Button>
                <Button onClick={handleCreate} disabled={saving || !form.name || !form.email || !form.password}>
                  {saving ? (isRTL ? "جار الحفظ..." : "Enregistrement...") : (isRTL ? "إنشاء" : "Créer")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold mb-4">{isRTL ? "تعديل المستخدم" : "Modifier l'utilisateur"}</h2>
            <div className="space-y-4">
              <div>
                <Label>{isRTL ? "الاسم" : "Nom"}</Label>
                <Input value={form.name} onChange={function (e) { setForm({ ...form, name: e.target.value }); }} />
              </div>
              <div>
                <Label>{isRTL ? "الدور" : "Rôle"}</Label>
                <select
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                  value={form.role}
                  onChange={function (e) { setForm({ ...form, role: e.target.value }); }}
                >
                  {ROLE_OPTIONS.map(function (r) {
                    return <option key={r.value} value={r.value}>{isRTL ? r.labelAr : r.labelFr}</option>;
                  })}
                </select>
              </div>
              <div>
                <Label>{isRTL ? "كلمة المرور (جديدة)" : "Mot de passe (nouveau)"}</Label>
                <Input type="password" value={form.password} onChange={function (e) { setForm({ ...form, password: e.target.value }); }} placeholder={isRTL ? "اترك فارغاً إذا لم ترد التغيير" : "Laisser vide pour conserver l'actuel"} />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <Button variant="outline" onClick={function () { setEditUser(null); }}>
                  {isRTL ? "إلغاء" : "Annuler"}
                </Button>
                <Button onClick={async function () {
                  if (!editUser) return;
                  var data: Record<string, string> = { name: form.name, role: form.role };
                  if (form.password) data.password = form.password;
                  await handleUpdate(editUser.id, data);
                }}>
                  {isRTL ? "حفظ" : "Enregistrer"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-bold mb-2">{isRTL ? "تأكيد الحذف" : "Confirmer la suppression"}</h2>
            <p className="text-muted-foreground text-sm mb-4">
              {isRTL ? "هل أنت متأكد من حذف هذا المستخدم؟" : "Êtes-vous sûr de vouloir supprimer cet utilisateur ?"}
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={function () { setDeleteConfirm(null); }}>
                {isRTL ? "إلغاء" : "Annuler"}
              </Button>
              <Button variant="destructive" onClick={async function () { if (deleteConfirm) await handleDelete(deleteConfirm); }}>
                {isRTL ? "حذف" : "Supprimer"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
