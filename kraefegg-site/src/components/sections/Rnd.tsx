import { SectionHeader } from '../ui/SectionHeader';
import { FlaskConical, Brain, Map, Ship, Zap, Cpu, Network, BarChart3 } from 'lucide-react';
import { ScrollReveal } from '../ui/ScrollReveal';
import { useI18n } from '../../i18n/context';

export function Rnd() {
  const { t } = useI18n();

  const rndAreas = [
    { icon: FlaskConical, title: t('rnd.area1.title'), desc: t('rnd.area1.desc') },
    { icon: Brain, title: t('rnd.area2.title'), desc: t('rnd.area2.desc') },
    { icon: Map, title: t('rnd.area3.title'), desc: t('rnd.area3.desc') },
    { icon: Ship, title: t('rnd.area4.title'), desc: t('rnd.area4.desc') },
    { icon: Zap, title: t('rnd.area5.title'), desc: t('rnd.area5.desc') },
    { icon: Cpu, title: t('rnd.area6.title'), desc: t('rnd.area6.desc') },
    { icon: Network, title: t('rnd.area7.title'), desc: t('rnd.area7.desc') },
    { icon: BarChart3, title: t('rnd.area8.title'), desc: t('rnd.area8.desc') },
  ];

  return (
    <section id="rnd" className="py-24 md:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-k-surface/20 to-black" />
      <div className="absolute inset-0 k-grid-bg opacity-20" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[radial-gradient(circle,rgba(0,159,227,0.06)_0%,transparent_70%)]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="KRAEFEGG R&D"
          subtitle={t('rnd.subtitle')}
        />

        <ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {rndAreas.map((area) => (
              <div key={area.title} className="k-glass rounded-2xl p-6 border border-k-border/40 hover:border-k-border/60 transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-[rgba(0,159,227,0.1)] flex items-center justify-center mb-4">
                  <area.icon className="w-6 h-6 text-[#009fe3]" />
                </div>
                <h4 className="text-base font-bold text-white mb-2 tracking-[-0.03em]">{area.title}</h4>
                <p className="text-sm text-k-text-secondary leading-relaxed">{area.desc}</p>
              </div>
            ))}
          </div>
        </ScrollReveal>

        {/* Research Network Visual */}
        <ScrollReveal delay={0.1}>
          <div className="mt-16 k-glass rounded-2xl p-8 text-center border border-k-border/40 hover:border-k-border/60 transition-all duration-300">
            <h3 className="text-lg font-bold text-white mb-4 tracking-[-0.03em]">{t('rnd.networkTitle')}</h3>
            <p className="text-sm text-k-text-secondary max-w-2xl mx-auto mb-8">
              {t('rnd.networkDesc')}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {['IA ↔ GIS', 'IoT ↔ Monitoramento', 'Energia ↔ Automação', 'Mineração ↔ IA', 'Marítimo ↔ IoT', 'Ambiental ↔ Sensores'].map((link) => (
                <span key={link} className="k-glass-subtle rounded-xl px-4 py-2.5 text-xs text-k-text-secondary font-mono">
                  {link}
                </span>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
