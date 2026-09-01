import { createClient } from "@/lib/supabase/server";
import { logout } from "./actions";
import { SidebarNav } from "@/components/dashboard/SidebarNav";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <SidebarNav email={user?.email ?? ""} logoutAction={logout} />
      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
