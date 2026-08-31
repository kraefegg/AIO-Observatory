import { SectionHeader } from '../ui/SectionHeader';
import { Sun, Wind, Battery, Zap, TrendingDown, BarChart3, Leaf } from 'lucide-react';
import { ScrollReveal } from '../ui/ScrollReveal';
import { useI18n } from '../../i18n/context';

export function Energy() {
  const { t } = useI18n();

  const energyCapabilities = [
    { icon: Sun, title: t('energy.cap1.title'), desc: t('energy.cap1.desc') },
    { icon: Wind, title: t('energy.cap2.title'), desc: t('energy.cap2.desc') },
    { icon: Battery, title: t('energy.cap3.title'), desc: t('energy.cap3.desc') },
    { icon: Zap, title: t('energy.cap4.title'), desc: t('energy.cap4.desc') },
    { icon: TrendingDown, title: t('energy.cap5.title'), desc: t('energy.cap5.desc') },
    { icon: BarChart3, title: t('energy.cap6.title'), desc: t('energy.cap6.desc') },
    { icon: Leaf, title: t('energy.cap7.title'), desc: t('energy.cap7.desc') },
  ];

  return (
    <section id="energy" className="py-24 md:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-[#1a1510] to-black" />
      <div className="absolute top-1/3 left-[10%] w-[500px] h-[400px] bg-[radial-gradient(circle,rgba(245,196,0,0.06)_0%,transparent_70%)]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title={t('energy.title')}
          subtitle={t('energy.subtitle')}
        />

        <ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {energyCapabilities.map((cap) => (
              <div key={cap.title} className="k-glass rounded-2xl p-6 border border-k-border/40 hover:border-k-gold/25 transition-all duration-300">
                <div className="w-10 h-10 rounded-lg bg-k-gold/10 border border-k-gold/15 flex items-center justify-center mb-4">
                  <cap.icon className="w-5 h-5 text-k-gold" />
                </div>
                <h4 className="text-base font-semibold text-white mb-2">{cap.title}</h4>
                <p className="text-sm text-k-text-secondary leading-relaxed">{cap.desc}</p>
              </div>
            ))}
          </div>
        </ScrollReveal>

        {/* Energy Flow Visual */}
        <ScrollReveal delay={0.1}>
          <div className="mt-16 k-glass rounded-2xl p-8 border border-k-border/40">
            <h3 className="text-lg font-black text-white tracking-[-0.03em] text-center mb-6">{t('energy.flowTitle')}</h3>
            <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
              {t('energy.flowSteps').split(',').map((step, i, arr) => (
                <div key={step} className="flex items-center gap-3">
                  <span className="k-glass-subtle rounded-xl px-4 py-3 text-k-gold font-medium text-sm">{step.trim()}</span>
                  {i < arr.length - 1 && <span className="text-k-text-dim">→</span>}
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
