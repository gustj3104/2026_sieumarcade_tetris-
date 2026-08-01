import type { CSSProperties, ReactNode } from "react";

interface PixelFrameProps {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  style?: CSSProperties;
}

/** Shared brick-frame border used by every panel box on the audience screen. */
export function PixelFrame({ children, className, innerClassName, style }: PixelFrameProps) {
  return (
    <div className={`pixel-frame ${className ?? ""}`} style={style}>
      <div className={`pixel-frame-inner pixel-frame-flex ${innerClassName ?? ""}`}>{children}</div>
    </div>
  );
}
