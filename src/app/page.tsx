import { SiteHeader } from '@/features/marketing/SiteHeader';
import { HeroSection } from '@/features/marketing/HeroSection';
import { CategoryStrip } from '@/features/marketing/CategoryStrip';
import { HowItWorks } from '@/features/marketing/HowItWorks';
import { SwapSection } from '@/features/marketing/SwapSection';
import { SignupSection } from '@/features/marketing/SignupSection';
import { SiteFooter } from '@/features/marketing/SiteFooter';
export default function Home() {
  return (
    <>
      <SiteHeader />

      <main>
        <HeroSection />

        <CategoryStrip />
        <HowItWorks />

        <SwapSection />

        <SignupSection />
      </main>
      <SiteFooter />
    </>
  );
}
