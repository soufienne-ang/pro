"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Session } from "next-auth";

interface AdminLayoutClientProps {
  children: React.ReactNode;
  locale: string;
  session: Session;
}

interface NavItem {
  href: string;
  icon: string;
  label: { ar: string; fr: string };
  roles: ReadonlyArray<string>;
}

const navItems: ReadonlyArray<NavItem> = [
  { href: "dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6", label: { ar: "لوحة التحكم", fr: "Tableau de bord" }, roles: ["SUPER_ADMIN", "HR_AGENT", "JURY_MEMBER", "REVIEWER"] },
  { href: "jobs", icon: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z", label: { ar: "المنشورات", fr: "Offres" }, roles: ["SUPER_ADMIN", "HR_AGENT"] },
  { href: "applications", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", label: { ar: "الطلبات", fr: "Candidatures" }, roles: ["SUPER_ADMIN", "HR_AGENT", "JURY_MEMBER", "REVIEWER"] },
  { href: "convocations", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4", label: { ar: "الاستدعاءات", fr: "Convocations" }, roles: ["SUPER_ADMIN", "HR_AGENT"] },
  { href: "scoring", icon: "M11 3.055A9.001 9.001 0 1020.945 13H11V3.055zM12 2a10 10 0 1010 10h-10V2z", label: { ar: "التقييم", fr: "Notation" }, roles: ["SUPER_ADMIN", "JURY_MEMBER", "REVIEWER"] },
  { href: "results", icon: "M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3", label: { ar: "النتائج", fr: "Résultats" }, roles: ["SUPER_ADMIN", "HR_AGENT", "JURY_MEMBER"] },
  { href: "candidates", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z", label: { ar: "المرشحين", fr: "Candidats" }, roles: ["SUPER_ADMIN", "HR_AGENT", "REVIEWER"] },
];

const ROLE_LABELS: Record<string, { ar: string; fr: string; cls: string }> = {
  SUPER_ADMIN: { ar: "مدير النظام", fr: "Administrateur", cls: "bg-purple-100 text-purple-800" },
  HR_AGENT: { ar: "عون موارد بشرية", fr: "Agent RH", cls: "bg-blue-100 text-blue-800" },
  JURY_MEMBER: { ar: "عضو لجنة التحكيم", fr: "Membre du Jury", cls: "bg-amber-100 text-amber-800" },
  REVIEWER: { ar: "مُقيِّم", fr: "Évaluateur", cls: "bg-slate-100 text-slate-700" },
};

export function AdminLayoutClient({ children, locale, session }: AdminLayoutClientProps) {
  const pathname = usePathname();
  const isRTL = locale === "ar";
  const base = `/${locale}/admin`;
  const role = session.user.role;
  const roleInfo = ROLE_LABELS[role] ?? ROLE_LABELS.REVIEWER;

  const visibleNavItems = navItems.filter((item) => item.roles.includes(role));

  const isActive = (href: string) => {
    if (href === "dashboard") return pathname === `${base}` || pathname === `${base}/dashboard`;
    return pathname.startsWith(`${base}/${href}`);
  };

  return (
    <div className="flex flex-1 flex-col bg-slate-50" dir={isRTL ? "rtl" : "ltr"}>
      <header className="bg-white border-b shadow-sm sticky top-0 z-20">
        <div className="flex items-center justify-between px-6 h-14">
          <Link href={base} className="text-lg font-bold text-primary">PROMOSPORT Admin</Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">{session.user.name}</span>
            <span className={`text-xs px-2 py-1 rounded font-medium ${roleInfo.cls}`}>
              {isRTL ? roleInfo.ar : roleInfo.fr}
            </span>
            <Link href={`/${locale}/api/auth/signout`}>
              <span className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                {isRTL ? "خروج" : "Déconnexion"}
              </span>
            </Link>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="w-56 shrink-0 bg-white border-r min-h-[calc(100vh-3.5rem)] p-3 hidden md:block">
          <nav className="space-y-1 sticky top-16">
            {visibleNavItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={`${base}/${item.href}`}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-slate-100"
                  }`}
                >
                  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                  </svg>
                  {isRTL ? item.label.ar : item.label.fr}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 p-6 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
