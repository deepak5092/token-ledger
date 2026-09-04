import { AuthOverlay } from "@/components/auth/AuthOverlay";
import { HomeContent } from "@/components/marketing/HomeContent";

// No dedicated login page layout: this route exists for middleware
// redirects and direct links, and renders the same marketing home page
// with the login modal pre-opened.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string; resetSent?: string; info?: string }>;
}) {
  const { error, next, resetSent, info } = await searchParams;

  return (
    <AuthOverlay
      initialMode="login"
      error={error}
      resetSent={resetSent === "1"}
      confirmInfo={info === "confirm"}
      next={next}
    >
      <HomeContent />
    </AuthOverlay>
  );
}
