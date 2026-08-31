import { useI18n } from '../../i18n/context';
import { Mail, MapPin, ArrowRight } from 'lucide-react';

export function Footer() {
  const { t } = useI18n();

  const footerLinks = {
    services: [
      t('nav.services.engAmbiental'),
      t('nav.services.mineralogia'),
      t('nav.services.seguranca'),
      t('nav.services.pericia'),
      t('nav.services.maritimo'),
      t('nav.services.energia'),
      t('nav.services.ia'),
      t('nav.services.iot'),
    ],
    company: [
      t('nav.about.sobre'),
      t('nav.about.fundador'),
      t('projects.title'),
      t('platforms.title'),
      t('feasibility.title'),
      t('rnd.title'),
    ],
    contact: [
      { label: t('contact.type1'), email: 'executive.business@kraefegg.com' },
      { label: t('contact.type2'), email: 'consulting@kraefegg.com' },
      { label: t('contact.type3'), email: 'consulting-maritime.port@kraefegg.com' },
      { label: t('contact.type4'), email: 'projects.engineering@kraefegg.com' },
      { label: t('contact.type5'), email: 'partnerships@kraefegg.com' },
    ],
  };

  return (
    <footer className="bg-k-surface border-t border-k-border/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* CTA Banner */}
        <div className="py-24 text-center">
          <p className="text-k-text-dim text-[11px] tracking-[0.3em] uppercase mb-6 font-mono">
            {t('footer.ctaQuestion')}
          </p>
          <h2 className="text-[clamp(1.8rem,4vw,3.5rem)] font-black text-white mb-10 tracking-[-0.03em]">
            {t('footer.ctaLine')}
          </h2>
          <a
            href="#contact"
            className="group inline-flex items-center gap-3 bg-white text-black px-8 py-4 rounded-full font-semibold text-sm hover:bg-white/90 transition-all duration-300"
          >
            {t('footer.ctaBtn')}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </a>
        </div>

        {/* Main Footer */}
        <div className="py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 border-t border-k-border/30">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-lg bg-k-blue flex items-center justify-center text-white font-bold text-sm relative overflow-hidden">
                <span className="relative z-10">K</span>
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
              </div>
              <div>
                <span className="text-[15px] font-bold text-white tracking-wider">KRAEFEGG M.O.</span>
                <span className="block text-[8px] text-k-text-dim tracking-[0.3em] uppercase -mt-0.5">
                  {t('footer.taglineLabel')}
                </span>
              </div>
            </div>
            <p className="text-k-text-muted text-sm leading-relaxed mb-6">
              {t('footer.tagline')}
            </p>
            <div className="flex items-start gap-2 text-k-text-dim text-sm">
              <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{t('footer.location')}</span>
            </div>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-[11px] font-bold text-k-text-secondary uppercase tracking-[0.15em] mb-6">
              {t('footer.servicesHeading')}
            </h3>
            <ul className="space-y-2.5">
              {footerLinks.services.map((item) => (
                <li key={item}>
                  <a href="#services" className="text-sm text-k-text-muted hover:text-white transition-colors duration-200">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-[11px] font-bold text-k-text-secondary uppercase tracking-[0.15em] mb-6">
              {t('footer.companyHeading')}
            </h3>
            <ul className="space-y-2.5">
              {footerLinks.company.map((item) => (
                <li key={item}>
                  <a href="#about" className="text-sm text-k-text-muted hover:text-white transition-colors duration-200">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-[11px] font-bold text-k-text-secondary uppercase tracking-[0.15em] mb-6">
              {t('footer.contactHeading')}
            </h3>
            <ul className="space-y-3.5">
              {footerLinks.contact.map((item) => (
                <li key={item.email}>
                  <p className="text-[10px] text-k-text-dim mb-0.5 uppercase tracking-wider">{item.label}</p>
                  <a
                    href={`mailto:${item.email}`}
                    className="flex items-center gap-2 text-xs text-k-text-muted hover:text-white transition-colors duration-200"
                  >
                    <Mail className="w-3 h-3" />
                    {item.email}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="py-6 border-t border-k-border/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[11px] text-k-text-dim">
            &copy; {new Date().getFullYear()} KRAEFEGG M.O. {t('footer.rights')}
          </p>
          <div className="h-[1px] w-16 kraefegg-gradient opacity-30 hidden sm:block" />
          <div className="flex items-center gap-6">
            <a href="#" className="text-[11px] text-k-text-dim hover:text-k-text-muted transition-colors">
              {t('footer.privacy')}
            </a>
            <a href="#" className="text-[11px] text-k-text-dim hover:text-k-text-muted transition-colors">
              {t('footer.terms')}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
