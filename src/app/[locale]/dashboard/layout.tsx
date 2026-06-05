import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { DashboardLayoutClient } from "./dashboard-layout-client";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
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

  if (session.user.role !== "CANDIDATE") {
    redirect(`/${locale}/admin/dashboard`);
  }

  return (
    <DashboardLayoutClient locale={locale} session={session}>
      {children}
    </DashboardLayoutClient>
  );
}
