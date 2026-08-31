import { SectionHeader } from '../ui/SectionHeader';
import { Ship, Anchor, Globe, Database, BarChart3, Shield, Radio } from 'lucide-react';
import { ScrollReveal } from '../ui/ScrollReveal';
import { useI18n } from '../../i18n/context';

export function Maritime() {
  const { t } = useI18n();

  const maritimeCapabilities = [
    { icon: Ship, title: t('maritime.cap1.title'), desc: t('maritime.cap1.desc') },
    { icon: Anchor, title: t('maritime.cap2.title'), desc: t('maritime.cap2.desc') },
    { icon: Globe, title: t('maritime.cap3.title'), desc: t('maritime.cap3.desc') },
    { icon: Database, title: t('maritime.cap4.title'), desc: t('maritime.cap4.desc') },
    { icon: BarChart3, title: t('maritime.cap5.title'), desc: t('maritime.cap5.desc') },
    { icon: Shield, title: t('maritime.cap6.title'), desc: t('maritime.cap6.desc') },
    { icon: Radio, title: t('maritime.cap7.title'), desc: t('maritime.cap7.desc') },
  ];

  return (
    <section id="maritime" className="py-24 md:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-[#0a1520] to-black" />
      <div className="absolute inset-0 k-grid-bg opacity-40" />
      <div className="absolute top-0 right-0 w-[600px] h-[500px] bg-[radial-gradient(circle,rgba(0,159,227,0.08)_0%,transparent_60%)]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title={t('maritime.title')}
          subtitle={t('maritime.subtitle')}
        />

        {/* Maritime Intelligence Banner */}
        <ScrollReveal>
          <div className="k-glass rounded-2xl p-8 md:p-12 mb-16 border border-k-blue/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-2 h-2 bg-k-blue rounded-full" />
              <span className="text-[11px] text-k-blue tracking-[0.2em] uppercase font-mono">{t('maritime.bannerLabel')}</span>
            </div>
            <h3 className="text-2xl md:text-3xl font-black text-white tracking-[-0.03em] mb-4">
              {t('maritime.bannerHeading')}
            </h3>
            <p className="text-k-text-secondary max-w-3xl leading-relaxed">
              {t('maritime.bannerDesc')}
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {maritimeCapabilities.map((cap) => (
              <div key={cap.title} className="k-glass rounded-2xl p-6 group hover:border-k-blue/25 transition-all duration-300 border border-k-border/40">
                <div className="w-10 h-10 rounded-xl bg-k-blue/10 border border-k-blue/15 flex items-center justify-center mb-4 group-hover:bg-k-blue/15 transition-colors">
                  <cap.icon className="w-5 h-5 text-k-blue" />
                </div>
                <h4 className="text-base font-black text-white tracking-[-0.03em] mb-2">{cap.title}</h4>
                <p className="text-sm text-k-text-secondary leading-relaxed">{cap.desc}</p>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
