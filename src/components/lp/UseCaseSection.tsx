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
    <section className="px-6 py-14 bg-white">
      <h2
        className="text-pr-dark text-4xl text-center mb-8"
        style={{ fontFamily: 'var(--font-bebas)' }}
      >
        {title}
      </h2>

      <div className="flex flex-col gap-4">
        {cases.map((c, i) => (
          <div
            key={i}
            className="flex items-start gap-4 bg-white border-[3px] border-pr-dark shadow-[0_4px_16px_rgba(0,0,0,.4)] rounded-[8px] px-5 py-4"
          >
            <span className="text-4xl mt-0.5 shrink-0">{c.icon}</span>
            <div>
              <p
                className="text-pr-dark font-bold leading-tight"
                style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.4rem' }}
              >
                {c.title}
              </p>
              <p className="text-gray-500 text-sm mt-1">{c.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
