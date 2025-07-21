"use client";
import { cn } from "../../../lib/utils";
import React, { ReactNode } from "react";
 
interface AuroraBackgroundProps extends React.HTMLProps<HTMLDivElement> {
  children: ReactNode;
  showRadialGradient?: boolean;
}
 
export const AuroraBackgroundSecondary = ({
  className,
  children,
  showRadialGradient = true,
  ...props
}: AuroraBackgroundProps) => {
  return (
    <main>
      <div
        className={cn(
          "transition-bg relative flex h-[100vh] flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 text-slate-900",
          className,
        )}
        {...props}
      >
        <div
          className="absolute inset-0 overflow-hidden"
          style={
            {
              "--aurora":
                "repeating-linear-gradient(100deg,#1e40af_10%,#3b82f6_15%,#2563eb_20%,#60a5fa_25%,#1d4ed8_30%)",
              "--light-gradient":
                "repeating-linear-gradient(100deg,#f8fafc_0%,#f8fafc_7%,transparent_10%,transparent_12%,#f8fafc_16%)",
              "--white-gradient":
                "repeating-linear-gradient(100deg,#fff_0%,#fff_7%,transparent_10%,transparent_12%,#fff_16%)",
 
              "--blue-300": "#60a5fa",
              "--blue-400": "#3b82f6",
              "--blue-500": "#1e40af",
              "--indigo-300": "#2563eb",
              "--violet-200": "#1d4ed8",
              "--light": "#f8fafc",
              "--white": "#fff",
              "--transparent": "transparent",
            } as React.CSSProperties
          }
        >
          <div
            className={cn(
              `after:animate-aurora pointer-events-none absolute -inset-[10px] [background-image:var(--white-gradient),var(--aurora)] [background-size:300%,_200%] [background-position:50%_50%,50%_50%] opacity-50 blur-[10px] filter will-change-transform [--aurora:repeating-linear-gradient(100deg,var(--blue-500)_10%,var(--indigo-300)_15%,var(--blue-300)_20%,var(--violet-200)_25%,var(--blue-400)_30%)] [--light-gradient:repeating-linear-gradient(100deg,var(--light)_0%,var(--light)_7%,var(--transparent)_10%,var(--transparent)_12%,var(--light)_16%)] [--white-gradient:repeating-linear-gradient(100deg,var(--white)_0%,var(--white)_7%,var(--transparent)_10%,var(--transparent)_12%,var(--white)_16%)] after:absolute after:inset-0 after:[background-image:var(--white-gradient),var(--aurora)] after:[background-size:200%,_100%] after:mix-blend-soft-light after:content-[\"\"]`,
 
              showRadialGradient &&
                `[mask-image:radial-gradient(ellipse_at_80%_30%,black_20%,var(--transparent)_80%)]`,
            )}
          ></div>
        </div>
        {children}
      </div>
    </main>
  );
};


