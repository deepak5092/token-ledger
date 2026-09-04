import { SiteHeader } from "@/components/marketing/SiteHeader";
import { Hero } from "@/components/marketing/Hero";
import { FeatureGrid } from "@/components/marketing/FeatureGrid";
import { UpcomingFeatures } from "@/components/marketing/UpcomingFeatures";
import { TrustSection } from "@/components/marketing/TrustSection";
import { SiteFooter } from "@/components/marketing/SiteFooter";

// Shared by "/", "/login", and "/signup": the latter two render the same
// marketing page with AuthOverlay's modal pre-opened, instead of a
// dedicated auth page layout.
export function HomeContent() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <SiteHeader />
      <Hero />
      <FeatureGrid />
      <UpcomingFeatures />
      <TrustSection />
      <SiteFooter />
    </div>
  );
}
