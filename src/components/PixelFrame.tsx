import type { CSSProperties, ReactNode } from "react";

interface PixelFrameProps {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  style?: CSSProperties;
  /** Tags the outer frame element so the battle-open burst can find its real on-screen rect. */
  "data-bt-unit"?: string;
}

/** Shared brick-frame border used by every panel box on the audience screen. */
export function PixelFrame({ children, className, innerClassName, style, "data-bt-unit": dataBtUnit }: PixelFrameProps) {
  return (
    <div className={`pixel-frame ${className ?? ""}`} style={style} data-bt-unit={dataBtUnit}>
      <div className={`pixel-frame-inner pixel-frame-flex ${innerClassName ?? ""}`}>{children}</div>
    </div>
  );
}
