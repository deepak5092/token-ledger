import { AuthOverlay } from "@/components/auth/AuthOverlay";
import { HomeContent } from "@/components/marketing/HomeContent";

export default function Home() {
  return (
    <AuthOverlay>
      <HomeContent />
    </AuthOverlay>
  );
}
