const HEADER_BG = 'linear-gradient(160deg, #041828 0%, #0a2840 55%, #0d3550 100%)';

export default function SubmitContactBlock() {
  return (
    <section className="max-w-md mx-auto">
      <div
        className="rounded-xl px-4 py-3 sm:px-5 sm:py-3.5 border border-[#00AFF0]/30 shadow-[0_8px_24px_-16px_rgba(0,40,80,0.45)]"
        style={{ background: HEADER_BG }}
      >
        <p className="text-[11px] sm:text-xs text-white/65 text-center mb-2.5 leading-snug">
          Need help? Get in touch:
        </p>
        <div className="flex flex-col sm:flex-row items-stretch gap-2">
          <a
            href="mailto:isabella@erogram.biz"
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-2 text-center transition-transform hover:-translate-y-px border border-[#00AFF0]/20 min-w-0"
          >
            <span className="text-sm leading-none shrink-0" aria-hidden="true">
              ✉️
            </span>
            <span className="text-[11px] sm:text-xs font-bold text-black truncate">isabella@erogram.biz</span>
          </a>
          <a
            href="https://t.me/erogramDOTpro"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-center text-black transition-transform hover:-translate-y-px border border-[#0077B3] bg-gradient-to-br from-[#009AD6] to-[#00AFF0] min-w-0"
          >
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.820 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
            </svg>
            <span className="text-[11px] sm:text-xs font-bold truncate">@erogramDOTpro</span>
          </a>
        </div>
      </div>
    </section>
  );
}
