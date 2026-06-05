import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { STAFF_ROLES, AppRole } from "@/lib/roles";
import { AdminLayoutClient } from "./admin-layout-client";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect(`/${locale}/login`);
  }

  if (!STAFF_ROLES.includes(session.user.role as AppRole)) {
    redirect(`/${locale}/dashboard`);
  }

  return (
    <AdminLayoutClient locale={locale} session={session}>
      {children}
    </AdminLayoutClient>
  );
}
