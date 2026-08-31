import { ScrollReveal } from './ScrollReveal';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
  light?: boolean;
}

export function SectionHeader({ title, subtitle, align = 'center', light = false }: SectionHeaderProps) {
  return (
    <ScrollReveal>
      <div className={`mb-16 ${align === 'center' ? 'text-center' : 'text-left'}`}>
        <h2
          className={`text-[clamp(1.8rem,4vw,3rem)] font-black tracking-[-0.03em] mb-5 leading-tight ${
            light ? 'text-black' : 'text-white'
          }`}
        >
          {title}
        </h2>
        {subtitle && (
          <p
            className={`text-base md:text-lg max-w-2xl leading-relaxed ${
              align === 'center' ? 'mx-auto' : ''
            } ${light ? 'text-k-steel' : 'text-k-text-muted'}`}
          >
            {subtitle}
          </p>
        )}
        <div
          className={`mt-8 h-[2px] w-12 kraefegg-gradient rounded-full ${
            align === 'center' ? 'mx-auto' : ''
          }`}
        />
      </div>
    </ScrollReveal>
  );
}
