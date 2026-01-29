import { Layout } from "@/components/layout/Layout";
import { HeroSection } from "@/components/home/HeroSection";
import { QuickActions } from "@/components/home/QuickActions";
import { UpcomingEvents } from "@/components/home/UpcomingEvents";
import { TestimoniesPreview } from "@/components/home/TestimoniesPreview";
import { CTASection } from "@/components/home/CTASection";
import { PWAInstallBanner } from "@/components/home/PWAInstallBanner";

const Index = () => {
  return (
    <Layout>
      <PWAInstallBanner />
      <HeroSection />
      <QuickActions />
      <UpcomingEvents />
      <TestimoniesPreview />
      <CTASection />
    </Layout>
  );
};

export default Index;
