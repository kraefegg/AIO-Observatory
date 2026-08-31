import { useState } from 'react';
import { projects } from '../../data/projects';
import { SectionHeader } from '../ui/SectionHeader';
import { MapPin, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { ScrollReveal } from '../ui/ScrollReveal';
import { useI18n } from '../../i18n/context';

const gradients = [
  'from-k-blue/20 via-k-steel/10 to-k-green/15',
  'from-k-gold/20 via-red-500/10 to-k-blue/15',
  'from-k-green/20 via-k-blue/10 to-k-gold/15',
  'from-red-500/20 via-k-gold/10 to-k-blue/15',
  'from-k-blue/20 via-k-green/10 to-red-500/15',
  'from-k-gold/15 via-k-blue/10 to-k-green/20',
];

export function Projects() {
  const { t } = useI18n();
  const [activeSector, setActiveSector] = useState('all');
  const [activeStatus, setActiveStatus] = useState('all');
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

  const sectors = [
    { id: 'all', label: t('projects.sector.all') },
    { id: 'ambiental', label: t('projects.sector.ambiental') },
    { id: 'energia', label: t('projects.sector.energia') },
    { id: 'mineracao', label: t('projects.sector.mineracao') },
    { id: 'maritimo', label: t('projects.sector.maritimo') },
    { id: 'tecnologia', label: t('projects.sector.tecnologia') },
  ];

  const projectStatuses = [
    { id: 'all', label: t('projects.status.all') },
    { id: 'concluído', label: t('projects.status.concluido') },
    { id: 'em andamento', label: t('projects.status.emAndamento') },
    { id: 'planejado', label: t('projects.status.planejado') },
  ];

  const filtered = projects.filter((p) => {
    if (activeSector !== 'all' && p.category !== activeSector) return false;
    if (activeStatus !== 'all' && p.status !== activeStatus) return false;
    return true;
  });

  return (
    <section id="projects" className="py-24 md:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-k-surface/20 to-black" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title={t('projects.title')}
          subtitle={t('projects.subtitle')}
        />

        {/* Filters */}
        <ScrollReveal>
          <div className="mb-12 space-y-4">
            <div className="flex flex-wrap gap-2 justify-center">
              {sectors.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveSector(s.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                    activeSector === s.id
                      ? 'bg-white text-black'
                      : 'k-glass-subtle text-k-text-muted hover:text-k-text-primary'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {projectStatuses.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveStatus(s.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
                    activeStatus === s.id
                      ? 'bg-k-blue/15 text-k-blue border border-k-blue/30'
                      : 'k-glass-subtle text-k-text-muted hover:text-k-text-primary'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filtered.map((project, idx) => (
                <div key={project.id} className="k-glass rounded-2xl overflow-hidden border border-k-border/40 hover:border-k-border/60 transition-all duration-300">
                  {/* Gradient placeholder */}
                  <div className={`aspect-video bg-gradient-to-br ${gradients[idx % gradients.length]}`} />

                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-1 text-[10px] font-bold tracking-wider uppercase rounded bg-k-blue/10 text-k-blue">
                          {project.sector}
                        </span>
                        <span className={`px-2 py-1 text-[10px] font-bold tracking-wider uppercase rounded ${
                          project.status === 'concluído' ? 'bg-k-green/10 text-k-green' :
                          project.status === 'em andamento' ? 'bg-k-gold/10 text-k-gold' :
                          'bg-k-steel/30 text-k-text-dim'
                        }`}>
                          {project.status}
                        </span>
                      </div>
                      {project.featured && (
                        <span className="px-2 py-1 text-[10px] font-bold tracking-wider uppercase rounded bg-k-red/10 text-k-red">
                          {t('projects.featured')}
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-white mb-2">
                      {project.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-k-text-secondary mb-3">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{project.location}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{project.year}</span>
                    </div>

                    <p className="text-sm text-k-text-secondary leading-relaxed mb-4">{project.description}</p>

                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {project.technologies.slice(0, 4).map((tech) => (
                        <span key={tech} className="px-2 py-1 k-glass-subtle rounded text-[10px] text-k-text-dim font-mono">
                          {tech}
                        </span>
                      ))}
                      {project.technologies.length > 4 && (
                        <span className="px-2 py-1 text-[10px] text-k-text-dim">+{project.technologies.length - 4}</span>
                      )}
                    </div>

                    <button
                      onClick={() => setExpandedProject(expandedProject === project.id ? null : project.id)}
                      className="flex items-center gap-1 text-xs text-k-blue hover:text-k-blue/80 transition-colors"
                    >
                      {expandedProject === project.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      {expandedProject === project.id ? t('projects.collapse') : t('projects.expand')}
                    </button>
                  </div>

                  {expandedProject === project.id && (
                    <div className="border-t border-k-border/40 p-6 space-y-4">
                      <div>
                        <h4 className="text-[10px] font-semibold text-k-text-dim uppercase tracking-wider mb-2">{t('projects.scope')}</h4>
                        <p className="text-sm text-k-text-secondary">{project.scope}</p>
                      </div>
                      <div>
                        <h4 className="text-[10px] font-semibold text-k-text-dim uppercase tracking-wider mb-2">{t('projects.techsLabel')}</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {project.technologies.map((tech) => (
                            <span key={tech} className="px-2 py-1 k-glass-subtle rounded text-[10px] text-k-text-secondary font-mono">{tech}</span>
                          ))}
                        </div>
                      </div>
                      {project.results.length > 0 && (
                        <div>
                          <h4 className="text-[10px] font-semibold text-k-text-dim uppercase tracking-wider mb-2">{t('projects.resultsLabel')}</h4>
                          <ul className="space-y-1">
                            {project.results.map((r) => (
                              <li key={r} className="flex items-start gap-2 text-sm text-k-text-secondary">
                                <span className="w-1 h-1 rounded-full bg-k-blue mt-2 shrink-0" />
                                {r}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-k-text-secondary">
              {t('projects.empty')}
            </div>
          )}
        </ScrollReveal>
      </div>
    </section>
  );
}
