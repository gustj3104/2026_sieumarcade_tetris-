/** READY? - a half-second visual trigger for the burst, not a caption. Gone before the burst finishes. */
export function ReadyPromptText() {
  return (
    <div className="bt-ready-prompt" aria-hidden="true">
      <div className="bt-ready-prompt-flash" />
      <span className="bt-ready-prompt-text">READY?</span>
    </div>
  );
}
