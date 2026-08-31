import { useState } from 'react';
import { capabilities } from '../../data/capabilities';
import { SectionHeader } from '../ui/SectionHeader';
import { ScrollReveal } from '../ui/ScrollReveal';
import { useI18n } from '../../i18n/context';
import { Leaf, Mountain, Shield, Search, Ship, Zap, Brain, Cpu, ChevronRight } from 'lucide-react';

const iconMap: Record<string, React.FC<{ className?: string }>> = {
  Leaf, Mountain, Shield, Search, Ship, Zap, Brain, Cpu,
};

const capColors: Record<string, { active: string; icon: string; dot: string; hover: string }> = {
  'environmental-engineering': { active: 'border-k-green/40', icon: 'text-k-green', dot: 'bg-k-green', hover: 'hover:border-k-green/20' },
  'mineralogy-mining': { active: 'border-k-gold/40', icon: 'text-k-gold', dot: 'bg-k-gold', hover: 'hover:border-k-gold/20' },
  'engineering-safety': { active: 'border-k-red/40', icon: 'text-k-red', dot: 'bg-k-red', hover: 'hover:border-k-red/20' },
  'forensics-audit': { active: 'border-k-red/40', icon: 'text-k-red', dot: 'bg-k-red', hover: 'hover:border-k-red/20' },
  'maritime-port': { active: 'border-k-blue/40', icon: 'text-k-blue', dot: 'bg-k-blue', hover: 'hover:border-k-blue/20' },
  'renewable-energy': { active: 'border-k-gold/40', icon: 'text-k-gold', dot: 'bg-k-gold', hover: 'hover:border-k-gold/20' },
  'ai-technology': { active: 'border-k-red/40', icon: 'text-k-red', dot: 'bg-k-red', hover: 'hover:border-k-red/20' },
  'embedded-iot': { active: 'border-k-blue/40', icon: 'text-k-blue', dot: 'bg-k-blue', hover: 'hover:border-k-blue/20' },
};

export function Services() {
  const { t } = useI18n();
  const [active, setActive] = useState(capabilities[0].id);
  const activeCapability = capabilities.find((c) => c.id === active) || capabilities[0];
  const Icon = iconMap[activeCapability.icon] || Leaf;
  const colors = capColors[active] || capColors['environmental-engineering'];

  return (
    <section id="services" className="py-24 md:py-32 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-k-surface/20 to-black" />
      <div className="absolute inset-0 k-grid-bg" />
      <div className="absolute top-0 right-[10%] w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(0,109,255,0.04)_0%,transparent_70%)]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title={t('services.title')}
          subtitle={t('services.subtitle')}
        />

        <ScrollReveal>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-4 space-y-1">
              {capabilities.map((cap) => {
                const CapIcon = iconMap[cap.icon] || Leaf;
                const capColor = capColors[cap.id] || capColors['environmental-engineering'];
                return (
                  <button
                    key={cap.id}
                    onClick={() => setActive(cap.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200 group border-l-2 ${
                      active === cap.id
                        ? `bg-k-surface-elevated/60 border-k-blue text-white`
                        : `border-transparent hover:bg-k-surface/40 text-k-text-muted`
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                        active === cap.id ? 'bg-k-blue/10' : 'bg-k-surface/50 group-hover:bg-k-surface-elevated/50'
                      }`}
                    >
                      <CapIcon className={`w-4 h-4 ${active === cap.id ? capColor.icon : 'text-k-text-dim'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium ${active === cap.id ? 'text-white' : 'text-k-text-muted'}`}>
                        {cap.title}
                      </div>
                      <div className="text-[11px] text-k-text-dim truncate">{cap.subtitle}</div>
                    </div>
                    <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-all ${active === cap.id ? `${capColor.icon} translate-x-0 opacity-100` : 'opacity-0 -translate-x-2'}`} />
                  </button>
                );
              })}
            </div>

            {/* Content */}
            <div className="lg:col-span-8">
              <div className="k-glass rounded-2xl p-8 border border-k-border/40">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-k-blue/10 border border-k-blue/15 flex items-center justify-center">
                    <Icon className={`w-6 h-6 ${colors.icon}`} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white tracking-[-0.03em]">{activeCapability.title}</h3>
                    <p className="text-xs text-k-text-secondary">{activeCapability.subtitle}</p>
                  </div>
                </div>

                <p className="text-k-text-secondary leading-relaxed mb-8">
                  {activeCapability.description}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activeCapability.items.map((item) => (
                    <div key={item} className="flex items-start gap-3 p-3 rounded-lg hover:bg-k-surface/30 transition-colors">
                      <div className={`w-1.5 h-1.5 rounded-full ${colors.dot} mt-2 shrink-0`} />
                      <span className="text-sm text-k-text-secondary">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
