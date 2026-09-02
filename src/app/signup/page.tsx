import { AuthOverlay } from "@/components/auth/AuthOverlay";
import { HomeContent } from "@/components/marketing/HomeContent";

// No dedicated signup page layout: this route exists for post-submit
// redirects (error / checkEmail) and direct links, and renders the same
// marketing home page with the signup modal pre-opened.
export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; checkEmail?: string }>;
}) {
  const { error, checkEmail } = await searchParams;

  return (
    <AuthOverlay initialMode="signup" error={error} checkEmail={checkEmail === "1"}>
      <HomeContent />
    </AuthOverlay>
  );
}
