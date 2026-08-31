import { SectionHeader } from '../ui/SectionHeader';
import { Award, Briefcase, GraduationCap, Wrench } from 'lucide-react';
import { ScrollReveal } from '../ui/ScrollReveal';
import { useI18n } from '../../i18n/context';

export function Founder() {
  const { t } = useI18n();

  const expertise = t('founder.expertise').split(',');

  return (
    <section id="founder" className="py-24 md:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-k-surface/20 to-black" />
      <div className="absolute inset-0 k-grid-bg opacity-20" />
      <div className="absolute top-1/2 left-[10%] w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(0,159,227,0.06)_0%,transparent_70%)]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title={t('founder.title')}
          subtitle={t('founder.subtitle')}
        />

        <div className="max-w-4xl mx-auto">
          <ScrollReveal>
            <div className="k-glass rounded-2xl p-8 md:p-12 border border-k-border/40 hover:border-k-border/60 transition-all duration-300">
              <div className="flex flex-col md:flex-row gap-8 items-start">
                {/* Photo area */}
                <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-k-surface to-k-graphite border border-k-border/40 shrink-0" />

                <div className="flex-1">
                  <p className="text-xs text-k-blue tracking-widest uppercase font-semibold mb-2">
                    {t('founder.role')}
                  </p>
                  <h3 className="text-2xl font-bold text-white mb-4">Railson de Arruda</h3>
                  <p className="text-k-text-secondary leading-relaxed mb-6">
                    {t('founder.body')}
                  </p>

                  {/* Expertise tags */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {expertise.map((item) => (
                      <span key={item} className="k-glass-subtle rounded-lg px-3 py-1.5 text-xs text-k-text-secondary">
                        {item.trim()}
                      </span>
                    ))}
                  </div>

                  {/* Icons */}
                  <div className="flex items-center gap-6 text-k-text-muted">
                    <div className="flex items-center gap-2 text-sm">
                      <Wrench className="w-4 h-4" />
                      <span>{t('founder.cat1')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <GraduationCap className="w-4 h-4" />
                      <span>{t('founder.cat2')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Briefcase className="w-4 h-4" />
                      <span>{t('founder.cat3')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Award className="w-4 h-4" />
                      <span>{t('founder.cat4')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
