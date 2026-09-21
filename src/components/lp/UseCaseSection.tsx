interface UseCase {
  icon: string;
  title: string;
  desc: string;
}

interface Props {
  title: string;
  cases: UseCase[];
}

export function UseCaseSection({ title, cases }: Props) {
  return (
    <section className="px-6 py-14 bg-[var(--kg-ink)]">
      <div className="flex flex-col items-center gap-3 mb-8">
        <span
          className="text-[0.62rem] uppercase text-[var(--kg-gold)]"
          style={{ fontFamily: 'var(--font-bebas)', letterSpacing: '0.42em', textIndent: '0.42em' }}
        >
          Use Cases
        </span>
        <h2
          className="text-[var(--kg-paper)] text-center text-[1.8rem]"
          style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.06em' }}
        >
          {title}
        </h2>
        <span aria-hidden className="block h-px w-12 bg-[var(--kg-accent)]" />
      </div>

      <div className="flex flex-col gap-4">
        {cases.map((c, i) => (
          <div
            key={i}
            className="flex items-start gap-4 bg-[var(--kg-sumi)] border border-[rgba(var(--kg-paper-rgb),.1)] px-5 py-4"
          >
            <span
              className="text-[var(--kg-gold)] text-[1.1rem] mt-0.5 shrink-0"
              style={{ fontFamily: 'var(--font-bebas)', letterSpacing: '0.05em' }}
            >
              {String(i + 1).padStart(2, '0')}
            </span>
            <div>
              <p
                className="text-[var(--kg-paper)] leading-tight text-[1.15rem]"
                style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.04em' }}
              >
                {c.title}
              </p>
              <p className="text-[var(--kg-mist)] text-sm mt-1.5 leading-relaxed">{c.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
