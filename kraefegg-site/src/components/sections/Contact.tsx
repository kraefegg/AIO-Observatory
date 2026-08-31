import { useState } from 'react';
import type { FormEvent } from 'react';
import { SectionHeader } from '../ui/SectionHeader';
import { Mail, Send, ArrowRight, Briefcase, Ship, Cpu, Building2, Handshake } from 'lucide-react';
import { ScrollReveal } from '../ui/ScrollReveal';
import { useI18n } from '../../i18n/context';

export function Contact() {
  const { t } = useI18n();
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    type: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const contactTypes = [
    { icon: Building2, label: t('contact.type1'), email: 'executive.business@kraefegg.com' },
    { icon: Briefcase, label: t('contact.type2'), email: 'consulting@kraefegg.com' },
    { icon: Ship, label: t('contact.type3'), email: 'consulting-maritime.port@kraefegg.com' },
    { icon: Cpu, label: t('contact.type4'), email: 'projects.engineering@kraefegg.com' },
    { icon: Handshake, label: t('contact.type5'), email: 'partnerships@kraefegg.com' },
  ];

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <section id="contact" className="py-24 md:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-k-surface/20 to-black" />
      <div className="absolute inset-0 k-grid-bg opacity-20" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[400px] bg-[radial-gradient(circle,rgba(0,159,227,0.06)_0%,transparent_70%)]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title={t('contact.title')}
          subtitle={t('contact.subtitle')}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <ScrollReveal>
            <div className="k-glass rounded-2xl p-8 border border-k-border/40 hover:border-k-border/60 transition-all duration-300">
              <h3 className="text-xl font-bold text-white mb-6 tracking-[-0.03em]">{t('contact.formTitle')}</h3>
              {submitted ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-k-green/10 flex items-center justify-center mx-auto mb-4">
                    <Send className="w-8 h-8 text-k-green" />
                  </div>
                  <h4 className="text-lg font-bold text-white mb-2">{t('contact.sentTitle')}</h4>
                  <p className="text-sm text-k-text-secondary">{t('contact.sentMsg')}</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-xs font-semibold text-k-text-dim uppercase tracking-wider mb-2">{t('contact.nameLabel')}</label>
                    <input
                      type="text"
                      required
                      value={formState.name}
                      onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                      className="w-full px-4 py-3 bg-k-surface border border-k-border/50 rounded-xl text-white placeholder-k-text-dim focus:border-k-blue/60 focus:ring-1 focus:ring-k-blue/20 transition-all outline-none text-sm"
                      placeholder={t('contact.namePlaceholder')}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-k-text-dim uppercase tracking-wider mb-2">{t('contact.emailLabel')}</label>
                    <input
                      type="email"
                      required
                      value={formState.email}
                      onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                      className="w-full px-4 py-3 bg-k-surface border border-k-border/50 rounded-xl text-white placeholder-k-text-dim focus:border-k-blue/60 focus:ring-1 focus:ring-k-blue/20 transition-all outline-none text-sm"
                      placeholder="seu@email.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-k-text-dim uppercase tracking-wider mb-2">{t('contact.areaLabel')}</label>
                    <select
                      value={formState.type}
                      onChange={(e) => setFormState({ ...formState, type: e.target.value })}
                      className="w-full px-4 py-3 bg-k-surface border border-k-border/50 rounded-xl text-white focus:border-k-blue/60 focus:ring-1 focus:ring-k-blue/20 transition-all outline-none text-sm"
                    >
                      <option value="">{t('contact.selectDefault')}</option>
                      {contactTypes.map((ct) => (
                        <option key={ct.email} value={ct.email}>{ct.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-k-text-dim uppercase tracking-wider mb-2">{t('contact.messageLabel')}</label>
                    <textarea
                      required
                      rows={5}
                      value={formState.message}
                      onChange={(e) => setFormState({ ...formState, message: e.target.value })}
                      className="w-full px-4 py-3 bg-k-surface border border-k-border/50 rounded-xl text-white placeholder-k-text-dim focus:border-k-blue/60 focus:ring-1 focus:ring-k-blue/20 transition-all outline-none text-sm resize-none"
                      placeholder={t('contact.messagePlaceholder')}
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 bg-white text-black rounded-full px-6 py-3.5 font-semibold hover:bg-white/90 transition-all cursor-pointer"
                  >
                    {t('contact.sendBtn')}
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          </ScrollReveal>

          {/* Contact Options */}
          <ScrollReveal delay={0.1}>
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-white mb-6 tracking-[-0.03em]">{t('contact.channelsTitle')}</h3>
              {contactTypes.map((ct) => (
                <a
                  key={ct.email}
                  href={`mailto:${ct.email}`}
                  className="k-glass rounded-2xl p-5 flex items-center gap-4 border border-k-border/40 hover:border-k-blue/25 transition-all duration-300 group block"
                >
                  <div className="w-12 h-12 rounded-xl bg-k-blue/10 flex items-center justify-center shrink-0 group-hover:bg-k-blue/15 transition-colors">
                    <ct.icon className="w-5 h-5 text-k-blue" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-white group-hover:text-k-blue transition-colors">{ct.label}</div>
                    <div className="text-xs text-k-text-dim flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {ct.email}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-k-text-dim group-hover:text-k-blue group-hover:translate-x-1 transition-all" />
                </a>
              ))}

              <div className="k-glass-subtle rounded-2xl p-6 mt-6">
                <p className="text-xs text-k-text-dim leading-relaxed">
                  {t('contact.disclaimer')}
                </p>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
