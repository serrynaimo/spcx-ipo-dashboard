// Small ⓘ icon with a hover tooltip explaining a control.
// `native` mode falls back to the browser title attribute (used inside
// scroll/overflow containers where an absolutely-positioned popup would clip).
export default function InfoTip({
  text,
  native,
  side = 'top',
}: {
  text: string
  native?: boolean
  side?: 'top' | 'bottom'
}) {
  const icon =
    'cursor-help select-none text-[9px] font-semibold leading-none text-slate-400 hover:text-accent ' +
    'border border-edge rounded-full w-3.5 h-3.5 inline-flex items-center justify-center'

  if (native) return <span title={text} className={icon} aria-label={text}>i</span>

  return (
    <span className="relative inline-flex group/tip align-middle">
      <span className={icon} aria-label={text}>i</span>
      <span
        role="tooltip"
        className={
          `pointer-events-none absolute z-50 left-1/2 -translate-x-1/2 w-56 rounded-lg border border-edge ` +
          `bg-panel2 px-2.5 py-1.5 text-[11px] font-normal normal-case tracking-normal leading-snug text-slate-200 ` +
          `shadow-xl opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 ` +
          (side === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5')
        }
      >
        {text}
      </span>
    </span>
  )
}
