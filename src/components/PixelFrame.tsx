import type { ReactNode } from "react";

interface PixelFrameProps {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
}

/** Shared brick-frame border used by every panel box on the audience screen. */
export function PixelFrame({ children, className, innerClassName }: PixelFrameProps) {
  return (
    <div className={`pixel-frame ${className ?? ""}`}>
      <div className={`pixel-frame-inner pixel-frame-flex ${innerClassName ?? ""}`}>{children}</div>
    </div>
  );
}
