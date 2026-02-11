import { Layout } from "@/components/layout/Layout";
import { HeroSection } from "@/components/home/HeroSection";
import { QuickActions } from "@/components/home/QuickActions";
import { UpcomingEvents } from "@/components/home/UpcomingEvents";
import { TestimoniesPreview } from "@/components/home/TestimoniesPreview";
import { CTASection } from "@/components/home/CTASection";
import { PWAInstallBanner } from "@/components/home/PWAInstallBanner";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AuthPanel } from "@/components/auth/AuthPanel";

const Index = () => {
  const { user, loading } = useAuth();

  return (
    <Layout>
      <Dialog open={!loading && !user}>
        <DialogContent className="max-w-xl border-none bg-transparent p-0 shadow-none">
          <div className="gradient-hero rounded-lg p-4 sm:p-6">
            <AuthPanel defaultMode="login" showBackLink={false} showFooterNote={false} redirectToDashboard={false} />
          </div>
        </DialogContent>
      </Dialog>
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
