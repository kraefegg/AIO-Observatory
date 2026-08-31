import { useState, useEffect } from 'react';
import { useI18n } from '../../i18n/context';
import { Menu, X, ChevronDown, Globe } from 'lucide-react';
import type { Locale } from '../../i18n/translations';

const navLinks = [
  { id: 'home', labelKey: 'nav.home', href: '#home' },
  {
    id: 'about',
    labelKey: 'nav.about',
    href: '#about',
    children: [
      { labelKey: 'nav.about.sobre', href: '#about' },
      { labelKey: 'nav.about.fundador', href: '#founder' },
    ],
  },
  {
    id: 'services',
    labelKey: 'nav.services',
    href: '#services',
    children: [
      { labelKey: 'nav.services.engAmbiental', href: '#services' },
      { labelKey: 'nav.services.mineralogia', href: '#services' },
      { labelKey: 'nav.services.seguranca', href: '#services' },
      { labelKey: 'nav.services.pericia', href: '#services' },
      { labelKey: 'nav.services.maritimo', href: '#maritime' },
      { labelKey: 'nav.services.energia', href: '#energy' },
      { labelKey: 'nav.services.ia', href: '#ai-tech' },
      { labelKey: 'nav.services.iot', href: '#embedded-iot' },
    ],
  },
  { id: 'projects', labelKey: 'nav.projects', href: '#projects' },
  { id: 'cases', labelKey: 'nav.cases', href: '#cases' },
  { id: 'platforms', labelKey: 'nav.platforms', href: '#platforms' },
  { id: 'feasibility', labelKey: 'nav.feasibility', href: '#feasibility' },
  { id: 'rnd', labelKey: 'nav.rnd', href: '#rnd' },
  { id: 'contact', labelKey: 'nav.contact', href: '#contact' },
];

const languages: { locale: Locale; label: string }[] = [
  { locale: 'pt', label: 'PT' },
  { locale: 'en', label: 'EN' },
  { locale: 'es', label: 'ES' },
];

export function Navbar() {
  const { t, locale, setLocale } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-black/70 backdrop-blur-xl border-b border-k-border/40'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[72px]">
          {/* Logo */}
          <a href="#home" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-k-blue flex items-center justify-center text-white font-bold text-sm relative overflow-hidden">
              <span className="relative z-10">K</span>
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
            </div>
            <div className="hidden sm:block">
              <span className="text-[15px] font-bold text-white tracking-wider">KRAEFEGG M.O.</span>
              <span className="block text-[8px] text-k-text-dim tracking-[0.3em] uppercase -mt-0.5">
                {t('nav.tagline')}
              </span>
            </div>
          </a>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-0.5">
            {navLinks.map((link) => (
              <div
                key={link.id}
                className="relative"
                onMouseEnter={() => link.children && setActiveDropdown(link.id)}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <a
                  href={link.href}
                  className="flex items-center gap-1 px-3 py-2 text-[12px] text-k-text-muted hover:text-white transition-colors font-medium"
                >
                  {t(link.labelKey)}
                  {link.children && <ChevronDown className="w-3 h-3 opacity-50" />}
                </a>

                {link.children && activeDropdown === link.id && (
                  <div className="absolute top-full left-0 pt-3">
                    <div className="bg-k-surface/95 backdrop-blur-xl border border-k-border/50 rounded-xl p-1.5 min-w-[220px]">
                      {link.children.map((child) => (
                        <a
                          key={child.labelKey}
                          href={child.href}
                          className="block px-3 py-2.5 text-[12px] text-k-text-muted hover:text-white hover:bg-k-surface-elevated/60 rounded-lg transition-colors"
                          onClick={() => setActiveDropdown(null)}
                        >
                          {t(child.labelKey)}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Language + Mobile Toggle */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-0.5 k-glass-subtle rounded-full px-2.5 py-1">
              <Globe className="w-3 h-3 text-k-text-dim" />
              {languages.map((lang) => (
                <button
                  key={lang.locale}
                  onClick={() => setLocale(lang.locale)}
                  className={`px-2 py-1 text-[10px] font-semibold rounded-full transition-all ${
                    locale === lang.locale
                      ? 'bg-k-blue/15 text-k-blue'
                      : 'text-k-text-dim hover:text-k-text-secondary'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsOpen(!isOpen)}
              className="lg:hidden p-2 text-k-text-muted hover:text-white transition-colors"
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="lg:hidden bg-black/95 backdrop-blur-xl border-t border-k-border/30">
          <div className="max-w-7xl mx-auto px-4 py-6 space-y-1">
            {navLinks.map((link) => (
              <a
                key={link.id}
                href={link.href}
                className="block px-4 py-3 text-k-text-muted hover:text-white hover:bg-k-surface/50 rounded-xl transition-colors font-medium text-sm"
                onClick={() => setIsOpen(false)}
              >
                {t(link.labelKey)}
              </a>
            ))}
            <div className="pt-4 flex items-center gap-2 px-4">
              <Globe className="w-4 h-4 text-k-text-dim" />
              {languages.map((lang) => (
                <button
                  key={lang.locale}
                  onClick={() => { setLocale(lang.locale); setIsOpen(false); }}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    locale === lang.locale
                      ? 'bg-k-blue/15 text-k-blue'
                      : 'text-k-text-dim hover:text-k-text-secondary'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
