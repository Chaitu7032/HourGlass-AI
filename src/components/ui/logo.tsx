import Image from "next/image";
import { cn } from "@/lib/utils";

type LogoSize = "sm" | "md" | "lg";
type LogoVariant = "light" | "dark";

interface LogoProps {
  size?: LogoSize;
  variant?: LogoVariant;
  className?: string;
  showText?: boolean;
}

const SIZE_STYLES: Record<
  LogoSize,
  {
    mark: number;
    title: string;
    subtitle: string;
    gap: string;
    hideSubtitleOnMobile: boolean;
  }
> = {
  sm: {
    mark: 44,
    title: "text-[20px] sm:text-[21px]",
    subtitle: "text-[13px]",
    gap: "gap-3",
    hideSubtitleOnMobile: true,
  },
  md: {
    mark: 56,
    title: "text-[24px]",
    subtitle: "text-[14px]",
    gap: "gap-3.5",
    hideSubtitleOnMobile: false,
  },
  lg: {
    mark: 72,
    title: "text-[36px] sm:text-[40px]",
    subtitle: "text-[16px] sm:text-[18px]",
    gap: "gap-4",
    hideSubtitleOnMobile: false,
  },
};

const VARIANT_STYLES: Record<LogoVariant, { title: string; subtitle: string }> = {
  light: {
    title: "text-white",
    subtitle: "text-white/70",
  },
  dark: {
    title: "text-zinc-950",
    subtitle: "text-zinc-950/70",
  },
};

export function Logo({ size = "md", variant = "light", className = "", showText = true }: LogoProps) {
  const config = SIZE_STYLES[size];
  const text = VARIANT_STYLES[variant];

  return (
    <div className={cn("inline-flex items-center", config.gap, className)}>
      <div
        className="relative shrink-0 overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10"
        style={{ width: config.mark, height: config.mark }}
      >
        <Image
          src="/logo.png"
          alt="Hourglass AI logo"
          fill
          priority={size === "lg"}
          sizes={`${config.mark}px`}
          className="object-contain"
        />
      </div>

      {showText && (
        <div className="min-w-0 flex flex-col justify-center leading-none">
          <span className={cn("whitespace-nowrap font-extrabold tracking-[-0.03em]", text.title, "leading-none")}>
            Hourglass AI
          </span>
          <span
            className={cn(
              "mt-1 whitespace-normal font-medium tracking-[0.02em] leading-snug",
              text.subtitle,
              config.hideSubtitleOnMobile ? "hidden sm:block" : "block"
            )}
          >
            Predictive Execution OS
          </span>
        </div>
      )}
    </div>
  );
}

export function LogoMark({ size = "md", variant = "light", className = "" }: Omit<LogoProps, "showText">) {
  return <Logo size={size} variant={variant} className={className} showText={false} />;
}
