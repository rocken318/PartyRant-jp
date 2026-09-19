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
    <section className="px-6 py-14 bg-gray-50">
      <h2
        className="text-pr-dark text-4xl text-center mb-8"
        style={{ fontFamily: 'var(--font-bebas)' }}
      >
        {title}
      </h2>

      <div className="flex flex-col gap-3">
        {items.map((item, i) => (
          <details
            key={i}
            className="group bg-white border-[3px] border-pr-dark shadow-[0_4px_12px_rgba(0,0,0,.35)] rounded-[8px] overflow-hidden"
          >
            <summary
              className="flex items-center justify-between px-5 py-4 cursor-pointer list-none font-bold text-pr-dark text-sm"
              style={{ fontFamily: 'var(--font-dm)' }}
            >
              <span className="pr-4">{item.q}</span>
              <span className="text-pr-pink text-xl font-bold shrink-0 group-open:rotate-45 transition-transform duration-200">
                +
              </span>
            </summary>
            <div className="px-5 pb-4 text-gray-500 text-sm leading-relaxed border-t-[2px] border-pr-dark pt-3">
              {item.a}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
