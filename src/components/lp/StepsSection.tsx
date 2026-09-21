interface Step {
  title: string;
  desc: string;
}

interface Props {
  title: string;
  steps: Step[];
}

const STEP_COLORS = ['var(--kg-accent)', 'var(--kg-gold)', '#6f8f6a'];

export function StepsSection({ title, steps }: Props) {
  return (
    <section className="px-6 py-14 bg-[var(--kg-ink)]">
      <div className="flex flex-col items-center gap-3 mb-10">
        <span
          className="text-[0.62rem] uppercase text-[var(--kg-gold)]"
          style={{ fontFamily: 'var(--font-bebas)', letterSpacing: '0.42em', textIndent: '0.42em' }}
        >
          How to
        </span>
        <h2
          className="text-[var(--kg-paper)] text-center text-[1.8rem]"
          style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.06em' }}
        >
          {title}
        </h2>
        <span aria-hidden className="block h-px w-12 bg-[var(--kg-accent)]" />
      </div>

      <div className="flex flex-col gap-6">
        {steps.map((s, i) => (
          <div key={i} className="flex items-start gap-5">
            {/* 番号バッジ（金の縁 + Cormorant） */}
            <div
              className="w-12 h-12 shrink-0 flex items-center justify-center border text-[var(--kg-paper)]"
              style={{
                fontFamily: 'var(--font-bebas)',
                fontSize: '1.5rem',
                borderColor: STEP_COLORS[i] + '88',
                letterSpacing: '0.02em',
              }}
            >
              {i + 1}
            </div>
            <div className="pt-1.5">
              <p
                className="text-[var(--kg-paper)] text-[1.15rem]"
                style={{ fontFamily: 'var(--font-dm)', lineHeight: 1.2, letterSpacing: '0.04em' }}
              >
                {s.title}
              </p>
              <p className="text-[var(--kg-mist)] text-sm mt-1.5 leading-relaxed">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
