import { SectionHeader } from '../ui/SectionHeader';
import { Target, Search, BarChart3, Leaf, DollarSign, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import { ScrollReveal } from '../ui/ScrollReveal';
import { useI18n } from '../../i18n/context';

export function Feasibility() {
  const { t } = useI18n();

  const lifecycleSteps = [
    { icon: Target, label: t('feasibility.step1') },
    { icon: Search, label: t('feasibility.step2') },
    { icon: BarChart3, label: t('feasibility.step3') },
    { icon: Leaf, label: t('feasibility.step4') },
    { icon: DollarSign, label: t('feasibility.step5') },
    { icon: AlertTriangle, label: t('feasibility.step6') },
    { icon: CheckCircle2, label: t('feasibility.step7') },
    { icon: DollarSign, label: t('feasibility.step8') },
    { icon: ArrowRight, label: t('feasibility.step9') },
  ];

  const feasibilityTypes = [
    { title: t('feasibility.type1.title'), desc: t('feasibility.type1.desc') },
    { title: t('feasibility.type2.title'), desc: t('feasibility.type2.desc') },
    { title: t('feasibility.type3.title'), desc: t('feasibility.type3.desc') },
    { title: t('feasibility.type4.title'), desc: t('feasibility.type4.desc') },
    { title: t('feasibility.type5.title'), desc: t('feasibility.type5.desc') },
    { title: t('feasibility.type6.title'), desc: t('feasibility.type6.desc') },
    { title: t('feasibility.type7.title'), desc: t('feasibility.type7.desc') },
    { title: t('feasibility.type8.title'), desc: t('feasibility.type8.desc') },
  ];

  return (
    <section id="feasibility" className="py-24 md:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-[#1a1510] to-black" />
      <div className="absolute inset-0 k-grid-bg opacity-20" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(245,196,0,0.06)_0%,transparent_70%)]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title={t('feasibility.title')}
          subtitle={t('feasibility.subtitle')}
        />

        {/* Lifecycle */}
        <ScrollReveal>
          <div className="mb-20">
            <h3 className="text-xl font-black text-white text-center mb-8 tracking-[-0.03em]">{t('feasibility.lifecycleTitle')}</h3>
            <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
              {lifecycleSteps.map((step, i) => (
                <div key={step.label} className="flex items-center gap-2 md:gap-3">
                  <div className="k-glass rounded-xl px-4 py-3 text-center hover:border-k-gold/25 transition-all duration-300">
                    <step.icon className="w-5 h-5 text-k-gold mx-auto mb-1" />
                    <span className="text-[10px] font-bold text-white">{step.label}</span>
                  </div>
                  {i < lifecycleSteps.length - 1 && (
                    <span className="text-k-text-dim hidden md:inline">→</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* Feasibility Types */}
        <ScrollReveal delay={0.1}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {feasibilityTypes.map((item) => (
              <div key={item.title} className="k-glass rounded-2xl p-6 border border-k-border/40 hover:border-k-border/60 transition-all duration-300">
                <h4 className="text-base font-bold text-white mb-2 tracking-[-0.03em]">{item.title}</h4>
                <p className="text-sm text-k-text-secondary leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </ScrollReveal>

        {/* CTA */}
        <ScrollReveal delay={0.2}>
          <div className="mt-16 text-center">
            <p className="text-k-text-dim mb-4">{t('feasibility.ctaDesc')}</p>
            <a href="#contact" className="inline-flex items-center gap-2 bg-white text-black rounded-full px-6 py-3 font-semibold hover:bg-white/90 transition-all">
              {t('feasibility.ctaBtn')}
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
