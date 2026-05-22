"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Session } from "next-auth";

interface DashboardLayoutClientProps {
  children: React.ReactNode;
  locale: string;
  session: Session;
}

export function DashboardLayoutClient({ children, locale, session }: DashboardLayoutClientProps) {
  const pathname = usePathname();
  const isRTL = locale === "ar";

  const navItems = [
    { href: `/${locale}/dashboard`, label: isRTL ? "لوحة التحكم" : "Tableau de bord" },
    { href: `/${locale}/dashboard/settings`, label: isRTL ? "الإعدادات" : "Paramètres" },
  ];

  return (
    <div className="flex flex-1 flex-col bg-slate-50" dir={isRTL ? "rtl" : "ltr"}>
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between p-4">
          <Link href={`/${locale}/dashboard`} className="text-xl font-bold text-primary">
            PROMOSPORT
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:inline">{session.user.email}</span>
            <Link href={`/${locale}/apply`}>
              <span className="px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors cursor-pointer">
                {isRTL ? "تقديم طلب جديد" : "Nouvelle candidature"}
              </span>
            </Link>
            <Link href={`/${locale}/api/auth/signout`}>
              <span className="px-3 py-1.5 text-sm font-medium border rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                {isRTL ? "تسجيل الخروج" : "Déconnexion"}
              </span>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        <div className="flex gap-6">
          <aside className="hidden md:block w-56 shrink-0">
            <nav className="space-y-1 sticky top-20">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-slate-100"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
          <main className="flex-1 min-w-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
