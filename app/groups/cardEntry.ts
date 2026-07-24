/**
 * Entry animation for feed cards (groups, bots, ads).
 *
 * Previously every card animated via JS with `delay: isIndex * 0.1`, so with ~42
 * cards the last one started 4.1s after load and the main thread stayed busy the
 * whole time — taps landing in that window were what Google measured as bad INP.
 *
 * Now: only the first few cards animate (the rest are below the fold and appear
 * instantly), the stagger is capped, and the animation itself is pure CSS.
 */

/** Cards past this position render instantly — nobody has scrolled to them yet. */
const ANIMATED_CARDS = 8;

/** Upper bound on the stagger, so total animation time stays under ~1s. */
const MAX_DELAY_S = 0.3;

const STEP_S = 0.05;

export function cardEntryProps(isIndex: number): {
  className: string;
  style?: React.CSSProperties;
} {
  if (isIndex >= ANIMATED_CARDS) return { className: '' };
  const delay = Math.min(isIndex * STEP_S, MAX_DELAY_S);
  return {
    className: 'card-in',
    style: { animationDelay: `${delay.toFixed(2)}s` },
  };
}
