import { useI18n } from '../../i18n/context';
import { SectionHeader } from '../ui/SectionHeader';
import { ScrollReveal } from '../ui/ScrollReveal';
import { Award, Globe, Cpu, TrendingUp } from 'lucide-react';

export function About() {
  const { t } = useI18n();

  const stats = [
    { icon: Award, value: '8+', label: t('about.stat1'), accent: 'text-k-green' },
    { icon: Globe, value: '3+', label: t('about.stat2'), accent: 'text-k-blue' },
    { icon: Cpu, value: '3+', label: t('about.stat3'), accent: 'text-k-gold' },
    { icon: TrendingUp, value: '100%', label: t('about.stat4'), accent: 'text-k-green' },
  ];

  return (
    <section id="about" className="py-24 md:py-32 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-k-surface/20 to-black" />
      <div className="absolute top-0 left-[20%] w-[600px] h-[400px] bg-[radial-gradient(circle,rgba(69,184,42,0.06)_0%,transparent_70%)]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title={t('about.title')}
          subtitle={t('about.description')}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <ScrollReveal direction="left">
            <div className="space-y-6">
              <p className="text-k-text-secondary leading-relaxed">
                {t('about.body1')}
              </p>
              <p className="text-k-text-secondary leading-relaxed">
                {t('about.body2')}
              </p>
              <div className="flex flex-wrap gap-2 pt-4">
                {t('about.tags').split(',').map((item) => (
                  <span key={item} className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm text-k-text-secondary font-medium border border-k-green/15 bg-k-green/5">
                    <span className="w-1.5 h-1.5 rounded-full bg-k-green/60" />
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="right" delay={0.2}>
            <div className="grid grid-cols-2 gap-5">
              {stats.map((stat) => (
                <div key={stat.label} className="k-glass rounded-2xl p-6 text-center border border-k-border/40 hover:border-k-green/20 transition-all duration-300">
                  <div className="w-10 h-10 rounded-xl bg-k-green/10 border border-k-green/15 flex items-center justify-center mx-auto mb-4">
                    <stat.icon className={`w-5 h-5 ${stat.accent}`} />
                  </div>
                  <div className="text-3xl font-black text-white tracking-[-0.03em] mb-1 font-mono">{stat.value}</div>
                  <div className="text-xs text-k-text-secondary">{stat.label}</div>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
