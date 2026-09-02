import { headers } from "next/headers";
import { logout } from "./actions";
import { SidebarNav } from "@/components/dashboard/SidebarNav";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  // Middleware already validated the session (a real network round trip to
  // Supabase's Auth API) and forwards the email via this header -- reading
  // it here avoids paying for that same round trip a second time on every
  // dashboard navigation. Middleware also already redirects unauthenticated
  // requests away from /dashboard/*, so reaching this layout at all implies
  // the header is present.
  const email = (await headers()).get("x-user-email") ?? "";

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <SidebarNav email={email} logoutAction={logout} />
      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
