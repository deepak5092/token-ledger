import { ResetPasswordGate } from "@/components/auth/ResetPasswordGate";

// The session check that used to gate this page server-side moved into
// ResetPasswordGate (client component) -- it has to run client-side to
// handle Supabase's default recovery link, which carries its tokens in a
// URL hash the server never sees. See that component for the full story.
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return <ResetPasswordGate error={error} />;
}
