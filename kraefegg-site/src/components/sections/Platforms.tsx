import { useState } from 'react';
import { platforms } from '../../data/platforms';
import { SectionHeader } from '../ui/SectionHeader';
import { ExternalLink, ChevronDown, ChevronUp, Server, Activity } from 'lucide-react';
import { ScrollReveal } from '../ui/ScrollReveal';
import { useI18n } from '../../i18n/context';

export function Platforms() {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <section id="platforms" className="py-24 md:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-k-surface/20 to-black" />
      <div className="absolute inset-0 k-grid-bg opacity-30" />
      <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(69,184,42,0.06)_0%,transparent_70%)]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title={t('platforms.title')}
          subtitle={t('platforms.subtitle')}
        />

        <div className="space-y-6">
          {platforms.map((platform) => (
            <ScrollReveal key={platform.id}>
              <div className="k-glass rounded-2xl overflow-hidden border border-k-border/40 hover:border-k-border/60 transition-all duration-300">
                <div className="p-6">
                  <div className="w-full h-40 rounded-xl bg-gradient-to-br from-k-surface to-k-graphite border border-k-border/20 mb-5" />

                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase rounded bg-k-green/10 text-k-green">
                          {platform.category}
                        </span>
                        <span className={`px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase rounded ${
                          platform.status === 'ativo' ? 'bg-k-green/10 text-k-green' :
                          platform.status === 'em andamento' ? 'bg-k-gold/10 text-k-gold' :
                          'bg-k-surface text-k-text-dim'
                        }`}>
                          {platform.status}
                        </span>
                      </div>
                      <h3 className="text-2xl font-black text-white tracking-[-0.03em]">{platform.name}</h3>
                    </div>
                    {platform.demoUrl && (
                      <a href={platform.demoUrl} target="_blank" rel="noopener noreferrer" className="text-k-text-dim hover:text-k-green transition-colors">
                        <ExternalLink className="w-5 h-5" />
                      </a>
                    )}
                  </div>

                  <p className="text-k-text-secondary leading-relaxed mb-5">{platform.description}</p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {platform.technologies.map((tech) => (
                      <span key={tech} className="px-3 py-1 k-glass-subtle rounded-lg text-xs text-k-text-dim font-mono">
                        {tech}
                      </span>
                    ))}
                  </div>

                  <button
                    onClick={() => setExpanded(expanded === platform.id ? null : platform.id)}
                    className="flex items-center gap-2 text-sm text-k-green hover:text-k-green/80 transition-colors mt-2"
                  >
                    {expanded === platform.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {expanded === platform.id ? t('platforms.collapse') : t('platforms.expand')}
                  </button>
                </div>

                {expanded === platform.id && (
                  <div className="border-t border-k-border/20 p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-sm font-semibold text-k-text-secondary uppercase tracking-wider mb-3">{t('platforms.problem')}</h4>
                        <p className="text-sm text-k-text-secondary leading-relaxed">{platform.problem}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-k-text-secondary uppercase tracking-wider mb-3">{t('platforms.solution')}</h4>
                        <p className="text-sm text-k-text-secondary leading-relaxed">{platform.solution}</p>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-k-text-secondary uppercase tracking-wider mb-3">{t('platforms.architecture')}</h4>
                      <div className="flex flex-wrap gap-2">
                        {platform.architecture.map((step) => (
                          <span key={step} className="px-3 py-2 k-glass-subtle rounded-lg text-xs text-k-text-secondary flex items-center gap-2">
                            <Server className="w-3 h-3 text-k-green" />
                            {step}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-k-text-secondary uppercase tracking-wider mb-3">{t('platforms.applications')}</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {platform.applications.map((app) => (
                          <div key={app} className="flex items-center gap-2 text-sm text-k-text-secondary">
                            <Activity className="w-3 h-3 text-k-green" />
                            {app}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
