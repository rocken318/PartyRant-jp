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
    <section className="px-6 py-14 bg-[#111114]">
      <div className="flex flex-col items-center gap-3 mb-8">
        <span
          className="text-[0.62rem] uppercase text-[#b8935a]"
          style={{ fontFamily: 'var(--font-bebas)', letterSpacing: '0.42em', textIndent: '0.42em' }}
        >
          FAQ
        </span>
        <h2
          className="text-[#ece7df] text-center text-[1.8rem]"
          style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.06em' }}
        >
          {title}
        </h2>
        <span aria-hidden className="block h-px w-12 bg-[#cf3a2e]" />
      </div>

      <div className="flex flex-col gap-3">
        {items.map((item, i) => (
          <details
            key={i}
            className="group bg-[#0a0a0b] border border-[rgba(236,231,223,.1)] overflow-hidden"
          >
            <summary
              className="flex items-center justify-between px-5 py-4 cursor-pointer list-none text-[#ece7df] text-sm"
              style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.03em' }}
            >
              <span className="pr-4">{item.q}</span>
              <span className="text-[#cf3a2e] text-xl shrink-0 group-open:rotate-45 transition-transform duration-200">
                +
              </span>
            </summary>
            <div className="px-5 pb-4 text-[#b9b4ac] text-sm leading-relaxed border-t border-[rgba(236,231,223,.1)] pt-3">
              {item.a}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
