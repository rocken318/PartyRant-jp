import { getTranslations } from 'next-intl/server';
import { HeroSection } from '@/components/lp/HeroSection';
import { UseCaseSection } from '@/components/lp/UseCaseSection';
import { FeatureSection } from '@/components/lp/FeatureSection';
import { StepsSection } from '@/components/lp/StepsSection';
import { FaqSection } from '@/components/lp/FaqSection';
import { FinalCtaSection } from '@/components/lp/FinalCtaSection';

export default async function LandingPageFull() {
  const t = await getTranslations('lp');

  const useCases = [
    { icon: t('usecase1Icon'), title: t('usecase1Title'), desc: t('usecase1Desc') },
    { icon: t('usecase2Icon'), title: t('usecase2Title'), desc: t('usecase2Desc') },
    { icon: t('usecase3Icon'), title: t('usecase3Title'), desc: t('usecase3Desc') },
  ];

  const features = [
    { title: t('feature1Title'), desc: t('feature1Desc'), color: '#cf3a2e' },
    { title: t('feature2Title'), desc: t('feature2Desc'), color: '#b8935a' },
    { title: t('feature3Title'), desc: t('feature3Desc'), color: '#6f8f6a' },
  ];

  const steps = [
    { title: t('step1Title'), desc: t('step1Desc') },
    { title: t('step2Title'), desc: t('step2Desc') },
    { title: t('step3Title'), desc: t('step3Desc') },
  ];

  const faqItems = [
    { q: t('faq1Q'), a: t('faq1A') },
    { q: t('faq2Q'), a: t('faq2A') },
    { q: t('faq3Q'), a: t('faq3A') },
    { q: t('faq4Q'), a: t('faq4A') },
  ];

  const extras = [t('extra1'), t('extra2'), t('extra3')];

  return (
    <main className="flex flex-col min-h-screen bg-white max-w-[480px] mx-auto">
      <HeroSection
        tagline={t('heroTagline')}
        headline={t('heroHeadline')}
        sub={t('heroSub')}
        cta1={t('heroCta1')}
        cta2={t('heroCta2')}
      />
      <UseCaseSection
        title={t('usecaseTitle')}
        cases={useCases}
      />
      <FeatureSection
        title={t('featuresTitle')}
        features={features}
        aiTitle={t('aiTitle')}
        aiDesc={t('aiDesc')}
        aiNewBadge={t('aiNewBadge')}
        extraTitle={t('extraFeaturesTitle')}
        extras={extras}
      />
      <StepsSection
        title={t('stepsTitle')}
        steps={steps}
      />
      <FaqSection
        title={t('faqTitle')}
        items={faqItems}
      />
      <FinalCtaSection
        title={t('ctaTitle')}
        cta1={t('ctaCta1')}
        cta2={t('ctaCta2')}
      />
    </main>
  );
}
