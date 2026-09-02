import { AuthOverlay } from "@/components/auth/AuthOverlay";
import { HomeContent } from "@/components/marketing/HomeContent";

// No dedicated login page layout: this route exists for middleware
// redirects and direct links, and renders the same marketing home page
// with the login modal pre-opened.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;

  return (
    <AuthOverlay initialMode="login" error={error} next={next}>
      <HomeContent />
    </AuthOverlay>
  );
}
