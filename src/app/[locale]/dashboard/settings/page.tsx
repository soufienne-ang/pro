"use client";

import { useState, useEffect, useCallback } from "react";

const GOVERNORATES = [
  "Ariana", "Béja", "Ben Arous", "Bizerte", "Gabès", "Gafsa", "Jendouba", "Kairouan",
  "Kasserine", "Kébili", "Le Kef", "Mahdia", "Manouba", "Medenine", "Monastir", "Nabeul",
  "Sfax", "Sidi Bouzid", "Siliana", "Sousse", "Tataouine", "Tozeur", "Tunis", "Zaghouan",
];

export default function SettingsPage() {
  const [locale, setLocale] = useState("fr");

  useEffect(() => {
    const segments = window.location.pathname.split("/");
    setLocale(segments[1] || "fr");
  }, []);

  const isRTL = locale === "ar";

  const [profile, setProfile] = useState({
    fullName: "",
    email: "",
    phone: "",
    cin: "",
    governorate: "",
    delegation: "",
    smsOptIn: true,
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState<"profile" | "password">("profile");

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/candidate/profile");
      if (res.ok) {
        const data = await res.json();
        setProfile({
          fullName: data.candidate.fullName || "",
          email: data.candidate.email || "",
          phone: data.candidate.phone || "",
          cin: data.candidate.cin || "",
          governorate: data.candidate.governorate || "",
          delegation: data.candidate.delegation || "",
          smsOptIn: data.candidate.smsOptIn ?? true,
        });
      }
    } catch {
      setError(isRTL ? "فشل في تحميل الملف الشخصي" : "Erreur de chargement du profil");
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

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("profile")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === "profile"
              ? "bg-primary text-primary-foreground"
              : "bg-white border hover:bg-slate-50"
          }`}
        >
          {isRTL ? "الملف الشخصي" : "Profil"}
        </button>
        <button
          onClick={() => setActiveTab("password")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === "password"
              ? "bg-primary text-primary-foreground"
              : "bg-white border hover:bg-slate-50"
          }`}
        >
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
              <input
                type="text"
                value={profile.fullName}
                onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{isRTL ? "البريد الإلكتروني" : "Email"}</label>
              <input
                type="email"
                value={profile.email}
                disabled
                className="flex h-10 w-full rounded-md border border-input bg-slate-50 px-3 py-2 text-sm text-muted-foreground"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{isRTL ? "رقم بطاقة التعريف" : "CIN"}</label>
              <input
                type="text"
                value={profile.cin}
                disabled
                className="flex h-10 w-full rounded-md border border-input bg-slate-50 px-3 py-2 text-sm text-muted-foreground"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{isRTL ? "رقم الهاتف" : "Téléphone"} *</label>
              <input
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                placeholder="00 000 000"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{isRTL ? "الولاية" : "Gouvernorat"} *</label>
              <select
                value={profile.governorate}
                onChange={(e) => setProfile({ ...profile, governorate: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
              >
                <option value="">{isRTL ? "اختر الولاية" : "Sélectionner"}</option>
                {GOVERNORATES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{isRTL ? "المعتمدية" : "Délégation"} *</label>
              <input
                type="text"
                value={profile.delegation}
                onChange={(e) => setProfile({ ...profile, delegation: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
              />
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={profile.smsOptIn}
                onChange={(e) => setProfile({ ...profile, smsOptIn: e.target.checked })}
                className="rounded border-gray-300 w-5 h-5"
              />
              <div>
                <span className="font-medium text-sm">
                  {isRTL ? "أوافق على استلام رسائل SMS" : "J'accepte de recevoir des SMS"}
                </span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isRTL
                    ? "سيتم إرسال إشعارات حول حالة طلباتك عبر الرسائل النصية"
                    : "Recevez des notifications sur l'état de vos candidatures par SMS"}
                </p>
              </div>
            </label>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {saving
                ? (isRTL ? "جار الحفظ..." : "Enregistrement...")
                : (isRTL ? "حفظ التغييرات" : "Enregistrer")}
            </button>
          </div>
        </form>
      )}

      {activeTab === "password" && (
        <form onSubmit={handlePasswordChange} className="bg-white rounded-xl border p-6 shadow-sm space-y-4 max-w-md">
          <div className="space-y-2">
            <label className="text-sm font-medium">{isRTL ? "كلمة المرور الحالية" : "Mot de passe actuel"} *</label>
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{isRTL ? "كلمة المرور الجديدة" : "Nouveau mot de passe"} *</label>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
              minLength={8}
            />
            <p className="text-xs text-muted-foreground">
              {isRTL
                ? "يجب أن تحتوي على 8 أحرف على الأقل، حرف كبير، حرف صغير، ورقم"
                : "Minimum 8 caractères, une majuscule, une minuscule et un chiffre"}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{isRTL ? "تأكيد كلمة المرور" : "Confirmer le mot de passe"} *</label>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
            />
          </div>

          <button
            type="submit"
            disabled={passwordSaving}
            className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50"
          >
            {passwordSaving
              ? (isRTL ? "جار التغيير..." : "Modification...")
              : (isRTL ? "تغيير كلمة المرور" : "Changer le mot de passe")}
          </button>
        </form>
      )}
    </div>
  );
}
