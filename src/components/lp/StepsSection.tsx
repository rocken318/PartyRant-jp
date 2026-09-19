interface Step {
  title: string;
  desc: string;
}

interface Props {
  title: string;
  steps: Step[];
}

const STEP_COLORS = ['#cf3a2e', '#b8935a', '#6f8f6a'];

export function StepsSection({ title, steps }: Props) {
  return (
    <section className="px-6 py-14 bg-white">
      <h2
        className="text-pr-dark text-4xl text-center mb-10 kg-serif"
        style={{ fontFamily: 'var(--font-bebas)' }}
      >
        {title}
      </h2>

      <div className="flex flex-col gap-6">
        {steps.map((s, i) => (
          <div key={i} className="flex items-start gap-5">
            {/* 番号バッジ */}
            <div
              className="w-12 h-12 shrink-0 flex items-center justify-center border-[3px] border-pr-dark shadow-[0_4px_12px_rgba(0,0,0,.4)] rounded-[8px] text-white font-bold"
              style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.5rem', backgroundColor: STEP_COLORS[i] }}
            >
              {i + 1}
            </div>
            <div className="pt-1">
              <p
                className="text-pr-dark font-bold"
                style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.4rem', lineHeight: 1.1 }}
              >
                {s.title}
              </p>
              <p className="text-gray-500 text-sm mt-1">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
