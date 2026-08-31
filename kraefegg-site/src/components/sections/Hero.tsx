import { ArrowDown, ArrowRight } from 'lucide-react';
import { ScrollReveal } from '../ui/ScrollReveal';

export function Hero() {
  return (
    <section id="home" className="relative min-h-[100vh] flex flex-col justify-center overflow-hidden">
      {/* Background layers */}
      <div className="absolute inset-0 bg-black" />
      <div className="absolute inset-0 k-grid-bg" />

      {/* Radial blue glow */}
      <div className="k-hero-glow absolute top-[20%] left-1/2 -translate-x-1/2 w-[1100px] h-[700px] pointer-events-none" />
      {/* Secondary green accent */}
      <div className="absolute bottom-[10%] right-[15%] w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(69,184,42,0.06)_0%,transparent_70%)] pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-32 pb-20">
        <ScrollReveal duration={1}>
          <div className="max-w-4xl">
            {/* Main Title */}
            <h1 className="mb-8">
              <span className="block text-[clamp(3rem,8vw,7rem)] font-black k-metallic-text tracking-[-0.02em] leading-[0.85]">
                KRAEFEGG M.O.
              </span>
            </h1>

            {/* Tagline */}
            <p className="max-w-3xl text-[13px] sm:text-sm md:text-base text-k-text-secondary leading-relaxed mb-12 tracking-wide">
              Strategic Environmental Engineering &bull; ESG &bull; Energy &bull; Mineral Intelligence Company &bull; Edge AI, IoT &amp; Embedded Systems &bull; AI Engineering &bull; Data Engineering
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <a
                href="#services"
                className="group inline-flex items-center gap-3 bg-white text-black px-8 py-4 rounded-full font-semibold text-sm hover:bg-white/90 transition-all duration-300"
              >
                Explore Capabilities
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
              <a
                href="#contact"
                className="inline-flex items-center gap-3 border border-white/20 text-white px-8 py-4 rounded-full font-semibold text-sm hover:bg-white/5 hover:border-white/30 transition-all duration-300"
              >
                Discuss a Project
              </a>
            </div>

            {/* ESG link */}
            <div className="mt-6">
              <a
                href="#about"
                className="text-sm text-k-text-dim hover:text-k-blue transition-colors inline-flex items-center gap-1.5 group"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-k-green group-hover:scale-125 transition-transform" />
                ESG &amp; Sustainability Solutions
              </a>
            </div>
          </div>
        </ScrollReveal>

        {/* Tech strip */}
        <ScrollReveal delay={0.4}>
          <div className="mt-20 pt-8 border-t border-k-border/30">
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              {['GIS', 'AI', 'IoT', 'Edge', 'Remote Sensing', 'Digital Twins'].map((tech) => (
                <span
                  key={tech}
                  className="text-[11px] tracking-[0.15em] uppercase font-mono text-k-text-dim/60 hover:text-k-blue transition-colors cursor-default duration-300"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </div>

      {/* Scroll indicator */}
      <a
        href="#about"
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-k-text-dim/50 hover:text-k-blue transition-colors group"
      >
        <span className="text-[9px] tracking-[0.3em] uppercase font-mono">Scroll</span>
        <ArrowDown className="w-3.5 h-3.5 animate-bounce" />
      </a>
    </section>
  );
}
