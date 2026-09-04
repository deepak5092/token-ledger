import { headers } from "next/headers";
import { logout } from "./actions";
import { SidebarNav } from "@/components/dashboard/SidebarNav";
import { ThemeToggle } from "@/components/ThemeToggle";

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
      {/* Reads the same --sidebar-w variable SidebarNav sets when its
          desktop collapse toggle is clicked, so this stays in sync with
          the sidebar's actual width without lifting state into a
          client-ified layout. 16rem matches the sidebar's default
          (expanded) width for the pre-JS/first-paint case. */}
      <main className="lg:[padding-left:var(--sidebar-w,16rem)] lg:transition-[padding-left] lg:duration-200">
        <div className="mx-auto flex max-w-6xl justify-end px-6 pt-4 lg:px-8 lg:pt-6">
          <ThemeToggle />
        </div>
        <div className="mx-auto max-w-6xl p-6 pt-2 lg:p-8 lg:pt-2">{children}</div>
      </main>
    </div>
  );
}
