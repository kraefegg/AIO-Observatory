import { useState } from 'react';
import { SectionHeader } from '../ui/SectionHeader';
import { Cpu, Wifi, Cloud, Database, BarChart3, ArrowRight, Sun, Radio, Zap } from 'lucide-react';
import { ScrollReveal } from '../ui/ScrollReveal';
import { useI18n } from '../../i18n/context';

function BrainIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
      <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
      <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
    </svg>
  );
}

export function EmbeddedIoT() {
  const { t } = useI18n();
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);

  const architectureSteps = [
    { icon: Radio, label: 'SENSORS', sub: t('iot.arch.sub1') },
    { icon: Cpu, label: 'EDGE DEVICE', sub: t('iot.arch.sub2') },
    { icon: BrainIcon, label: 'LOCAL AI', sub: t('iot.arch.sub3') },
    { icon: Wifi, label: 'NETWORK', sub: t('iot.arch.sub4') },
    { icon: Cloud, label: 'CLOUD', sub: t('iot.arch.sub5') },
    { icon: Database, label: 'DATABASE', sub: 'Armazenamento' },
    { icon: BarChart3, label: 'DASHBOARD', sub: 'Visualização' },
    { icon: Zap, label: 'DECISION', sub: 'Apoio à Decisão' },
  ];

  const techSpecs = [
    { icon: Cpu, label: t('iot.spec1.label'), desc: t('iot.spec1.desc') },
    { icon: Sun, label: t('iot.spec2.label'), desc: t('iot.spec2.desc') },
    { icon: Radio, label: t('iot.spec3.label'), desc: t('iot.spec3.desc') },
    { icon: Zap, label: t('iot.spec4.label'), desc: t('iot.spec4.desc') },
  ];

  const applications = t('iot.apps').split(',');

  return (
    <section id="embedded-iot" className="py-24 md:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-k-surface/20 to-black" />
      <div className="absolute inset-0 k-grid-bg opacity-20" />
      <div className="absolute top-1/2 right-[5%] w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(0,159,227,0.06)_0%,transparent_70%)]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title={t('iot.title')}
          subtitle={t('iot.subtitle')}
        />

        {/* Architecture Flow */}
        <ScrollReveal>
          <div className="mb-20">
            <h3 className="text-xl font-black text-white tracking-[-0.03em] text-center mb-8">{t('iot.archTitle')}</h3>
            <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
              {architectureSteps.map((step, i) => (
                <div key={step.label} className="flex items-center gap-2 md:gap-3">
                  <div
                    className={`k-glass rounded-2xl px-4 py-3 text-center min-w-[95px] cursor-pointer transition-all duration-300 border ${
                      hoveredStep === i ? 'border-k-blue/40' : 'border-k-border/40'
                    }`}
                    onMouseEnter={() => setHoveredStep(i)}
                    onMouseLeave={() => setHoveredStep(null)}
                  >
                    <step.icon className={`w-5 h-5 mx-auto mb-2 transition-colors duration-300 ${hoveredStep === i ? 'text-k-blue' : 'text-k-text-dim'}`} />
                    <div className="text-[10px] font-bold text-white">{step.label}</div>
                    <div className="text-[9px] text-k-text-dim">{step.sub}</div>
                  </div>
                  {i < architectureSteps.length - 1 && (
                    <ArrowRight className="w-3.5 h-3.5 text-k-text-dim hidden md:block" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tech Specs */}
            <div className="k-glass rounded-2xl p-7 border border-k-border/40">
              <h3 className="text-base font-black text-white tracking-[-0.03em] mb-5">{t('iot.specsTitle')}</h3>
              <div className="space-y-3">
                {techSpecs.map((spec) => (
                  <div key={spec.label} className="flex items-start gap-3 p-3 rounded-xl hover:bg-k-surface/30 transition-colors">
                    <div className="w-9 h-9 rounded-lg bg-k-blue/10 border border-k-blue/15 flex items-center justify-center shrink-0">
                      <spec.icon className="w-4 h-4 text-k-blue" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">{spec.label}</div>
                      <div className="text-xs text-k-text-secondary">{spec.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Applications */}
            <div className="k-glass rounded-2xl p-7 border border-k-border/40">
              <h3 className="text-base font-black text-white tracking-[-0.03em] mb-5">{t('iot.appsTitle')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {applications.map((app) => (
                  <div key={app} className="flex items-center gap-2 p-2 rounded-xl hover:bg-k-surface/30 transition-colors">
                    <div className="w-1.5 h-1.5 rounded-full bg-k-blue shrink-0" />
                    <span className="text-xs text-k-text-secondary">{app.trim()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
