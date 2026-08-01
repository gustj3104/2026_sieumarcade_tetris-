/**
 * A single whole-viewport flash pulse for the READY? beat. The READY? text
 * itself is drawn on the board canvas (rendering/renderer.ts) so it stays
 * perfectly in sync with the board's own energy-wave effects; this piece
 * only supplies the screen-wide flash that the canvas (scoped to the board
 * panel) can't reach on its own.
 */
export function ReadyPrompt() {
  return <div className="bt-ready-flash" aria-hidden="true" />;
}
