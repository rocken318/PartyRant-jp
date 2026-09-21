interface FaqItem {
  q: string;
  a: string;
}

interface Props {
  title: string;
  items: FaqItem[];
}

export function FaqSection({ title, items }: Props) {
  return (
    <section className="px-6 py-14 bg-[var(--kg-sumi)]">
      <div className="flex flex-col items-center gap-3 mb-8">
        <span
          className="text-[0.62rem] uppercase text-[var(--kg-gold)]"
          style={{ fontFamily: 'var(--font-bebas)', letterSpacing: '0.42em', textIndent: '0.42em' }}
        >
          FAQ
        </span>
        <h2
          className="text-[var(--kg-paper)] text-center text-[1.8rem]"
          style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.06em' }}
        >
          {title}
        </h2>
        <span aria-hidden className="block h-px w-12 bg-[var(--kg-accent)]" />
      </div>

      <div className="flex flex-col gap-3">
        {items.map((item, i) => (
          <details
            key={i}
            className="group bg-[var(--kg-ink)] border border-[rgba(var(--kg-paper-rgb),.1)] overflow-hidden"
          >
            <summary
              className="flex items-center justify-between px-5 py-4 cursor-pointer list-none text-[var(--kg-paper)] text-sm"
              style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.03em' }}
            >
              <span className="pr-4">{item.q}</span>
              <span className="text-[var(--kg-accent)] text-xl shrink-0 group-open:rotate-45 transition-transform duration-200">
                +
              </span>
            </summary>
            <div className="px-5 pb-4 text-[var(--kg-paper-dim)] text-sm leading-relaxed border-t border-[rgba(var(--kg-paper-rgb),.1)] pt-3">
              {item.a}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
