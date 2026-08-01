interface BattleOpenScreenProps {
  logoUrl: string | null;
}

/**
 * The persisted "battle open" hold screen: event key visual (admin-uploaded
 * logo if one was set, otherwise a scaled-up recreation of the existing
 * BattleHeader wordmark - never a newly invented logo) plus BATTLE STARTS
 * NOW. Mounted for both the one-time keyVisualReveal entrance and the
 * indefinite battleOpen hold that follows; all repeat/ambient motion here is
 * pure CSS so it needs no timers and cleans itself up on unmount (admin
 * restart).
 */
export function BattleOpenScreen({ logoUrl }: BattleOpenScreenProps) {
  return (
    <div className="bt-open-screen">
      <div className="bt-open-rays" aria-hidden="true" />
      <div className="bt-open-stars" aria-hidden="true">
        {Array.from({ length: 8 }).map((_, i) => (
          <span key={i} className={`bt-star bt-star-${i}`} />
        ))}
      </div>

      <div className="bt-keyvisual-outline">
        <div className="bt-keyvisual">
          {logoUrl ? (
            <img src={logoUrl} alt="행사 키비주얼" className="bt-keyvisual-img" />
          ) : (
            <div className="bt-keyvisual-fallback">
              <div className="bt-kv-rainbow" aria-hidden="true" />
              <div className="bt-kv-star" aria-hidden="true" />
              <div className="bt-kv-see">SEE THE SOUND</div>
              <div className="bt-kv-logo">SIEUMARCADE</div>
              <div className="bt-kv-sub">[ LIVE BAND BATTLE ]</div>
            </div>
          )}
        </div>
      </div>

      <div className="bt-battle-starts">
        <span>BATTLE STARTS NOW</span>
      </div>

      <div className="bt-open-bottomline" aria-hidden="true" />
    </div>
  );
}
