import { useState } from 'react';
import { SectionHeader } from '../ui/SectionHeader';
import { ScrollReveal } from '../ui/ScrollReveal';
import { cases } from '../../data/cases';
import { MapPin, Calendar, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { useI18n } from '../../i18n/context';

const categoryLabels: Record<string, string> = {
  all: 'Todos',
  ambiental: 'Ambiental',
  maritimo: 'Marítimo',
  energia: 'Energia',
  mineracao: 'Mineração',
  tecnologia: 'Tecnologia',
};

const categoryColors: Record<string, string> = {
  ambiental: 'border-k-green/25',
  maritimo: 'border-k-blue/25',
  energia: 'border-k-gold/25',
  mineracao: 'border-k-gold/25',
  tecnologia: 'border-k-red/25',
};

export function Cases() {
  const { t } = useI18n();
  const [activeCat, setActiveCat] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = activeCat === 'all' ? cases : cases.filter((c) => c.category === activeCat);

  return (
    <section id="cases" className="py-24 md:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-k-surface/20 to-black" />
      <div className="absolute top-[10%] left-[-10%] w-[600px] h-[400px] bg-[radial-gradient(circle,rgba(0,159,227,0.06)_0%,transparent_70%)] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title={t('cases.title')}
          subtitle={t('cases.subtitle')}
        />

        {/* Filters */}
        <ScrollReveal>
          <div className="flex flex-wrap gap-2 justify-center mb-12">
            {Object.entries(categoryLabels).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveCat(key)}
                className={`px-5 py-2 rounded-full text-xs font-semibold transition-all duration-300 ${
                  activeCat === key
                    ? 'bg-white text-black'
                    : 'k-glass-subtle text-k-text-muted hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </ScrollReveal>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((c, index) => (
            <ScrollReveal key={c.id} delay={index * 0.05}>
              <article
                className={`k-glass rounded-2xl overflow-hidden border border-k-border/40 hover:border-k-border/70 transition-all duration-300 group flex flex-col h-full ${
                  categoryColors[c.category] || ''
                }`}
              >
                {/* Image */}
                <div className="aspect-[16/10] overflow-hidden relative bg-k-surface">
                  <img
                    src={c.image}
                    alt={c.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  {/* Sector badge */}
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/60 backdrop-blur text-white">
                    {c.sector}
                  </span>
                </div>

                {/* Body */}
                <div className="p-6 flex flex-col flex-1">
                  <h3 className="text-lg font-black text-white tracking-[-0.02em] mb-2">
                    {c.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-k-text-dim mb-3">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3 h-3" />
                      {c.location}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" />
                      {c.year}
                    </span>
                  </div>

                  <p className="text-sm text-k-text-secondary leading-relaxed mb-4">
                    {c.summary}
                  </p>

                  {/* Highlights */}
                  <div className="mt-auto">
                    {expanded === c.id && (
                      <ul className="space-y-2 mb-4">
                        {c.highlights.map((h) => (
                          <li key={h} className="flex items-start gap-2 text-sm text-k-text-secondary">
                            <CheckCircle2 className="w-4 h-4 text-k-green mt-0.5 shrink-0" />
                            {h}
                          </li>
                        ))}
                      </ul>
                    )}

                    <button
                      onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                      className="flex items-center gap-2 text-sm text-k-blue hover:text-white transition-colors font-medium group"
                    >
                      {expanded === c.id ? (
                        <>
                          <ChevronUp className="w-4 h-4" />
                          {t('cases.collapse')}
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          {t('cases.expand')}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
