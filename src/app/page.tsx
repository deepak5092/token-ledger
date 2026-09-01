import { SiteHeader } from "@/components/marketing/SiteHeader";
import { Hero } from "@/components/marketing/Hero";
import { FeatureGrid } from "@/components/marketing/FeatureGrid";
import { TrustSection } from "@/components/marketing/TrustSection";
import { SiteFooter } from "@/components/marketing/SiteFooter";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <SiteHeader />
      <Hero />
      <FeatureGrid />
      <TrustSection />
      <SiteFooter />
    </div>
  );
}
