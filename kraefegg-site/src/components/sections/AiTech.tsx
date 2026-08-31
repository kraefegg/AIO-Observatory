import { SectionHeader } from '../ui/SectionHeader';
import { Brain, BarChart3, Map, Eye, Activity } from 'lucide-react';
import { ScrollReveal } from '../ui/ScrollReveal';
import { useI18n } from '../../i18n/context';

const accentStyles: Record<string, { border: string; bg: string; text: string; bar: string }> = {
  'k-green': { border: 'border-k-green/15', bg: 'bg-k-green/10', text: 'text-k-green', bar: 'bg-k-green' },
  'k-gold': { border: 'border-k-gold/15', bg: 'bg-k-gold/10', text: 'text-k-gold', bar: 'bg-k-gold' },
  'k-blue': { border: 'border-k-blue/15', bg: 'bg-k-blue/10', text: 'text-k-blue', bar: 'bg-k-blue' },
  'k-steel-light': { border: 'border-k-steel/30', bg: 'bg-k-steel/20', text: 'text-k-silver', bar: 'bg-k-silver' },
};

export function AiTech() {
  const { t } = useI18n();

  const aiCapabilities = [
    {
      icon: Brain,
      title: t('ai.cap1.title'),
      items: t('ai.cap1.items').split(','),
    },
    {
      icon: Map,
      title: t('ai.cap2.title'),
      items: t('ai.cap2.items').split(','),
    },
    {
      icon: BarChart3,
      title: t('ai.cap3.title'),
      items: t('ai.cap3.items').split(','),
    },
    {
      icon: Eye,
      title: t('ai.cap4.title'),
      items: t('ai.cap4.items').split(','),
    },
  ];

  const dashboards = [
    { name: 'Environmental Dashboard', desc: t('ai.dash1.desc'), accent: 'k-green' },
    { name: 'Energy Dashboard', desc: t('ai.dash2.desc'), accent: 'k-gold' },
    { name: 'Maritime Dashboard', desc: t('ai.dash3.desc'), accent: 'k-blue' },
    { name: 'Industrial Dashboard', desc: t('ai.dash4.desc'), accent: 'k-steel-light' },
    { name: 'Project Dashboard', desc: t('ai.dash5.desc'), accent: 'k-blue' },
    { name: 'ESG Dashboard', desc: t('ai.dash6.desc'), accent: 'k-green' },
  ];

  return (
    <section id="ai-tech" className="py-24 md:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-[#1a1010] to-black" />
      <div className="absolute bottom-0 left-1/4 w-[600px] h-[400px] bg-[radial-gradient(circle,rgba(229,37,33,0.06)_0%,transparent_70%)]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title={t('ai.title')}
          subtitle={t('ai.subtitle')}
        />

        {/* AI Capabilities */}
        <ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20">
            {aiCapabilities.map((cap) => (
              <div key={cap.title} className="k-glass rounded-2xl p-6 border border-k-border/40 hover:border-red-500/25 transition-all duration-300">
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/15 flex items-center justify-center">
                    <cap.icon className="w-5 h-5 text-red-500" />
                  </div>
                  <h3 className="text-lg font-black text-white tracking-[-0.03em]">{cap.title}</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {cap.items.map((item) => (
                    <span key={item} className="px-3 py-1.5 k-glass-subtle rounded-md text-xs text-k-text-secondary">
                      {item.trim()}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollReveal>

        {/* Dashboard Showcase */}
        <ScrollReveal delay={0.1}>
          <div className="mb-8">
            <h3 className="text-2xl font-black text-white tracking-[-0.03em] text-center mb-2">{t('ai.dashTitle')}</h3>
            <p className="text-k-text-secondary text-center mb-10 text-sm">{t('ai.dashSubtitle')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {dashboards.map((dash) => {
              const style = accentStyles[dash.accent] || accentStyles['k-blue'];
              return (
                <div key={dash.name} className="k-glass rounded-2xl p-6 border border-k-border/40 hover:border-k-border/60 transition-all duration-300 cursor-pointer">
                  <div className="flex items-center gap-3 mb-3">
                    <Activity className={`w-4 h-4 ${style.text}`} />
                    <span className="text-sm font-semibold text-white">{dash.name}</span>
                  </div>
                  <p className="text-xs text-k-text-secondary leading-relaxed">{dash.desc}</p>
                  <div className="mt-4 flex items-end gap-1 h-10">
                    {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (
                      <div
                        key={i}
                        className={`flex-1 rounded-t opacity-60 ${style.bar}`}
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
