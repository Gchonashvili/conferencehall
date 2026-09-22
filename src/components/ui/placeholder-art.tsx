import { cn } from "@/lib/utils";

/**
 * Generated stand-in for hall photography during development. Real photos
 * come from venues at onboarding; the reference's stock photos are not used.
 */
type Variant = "theatre" | "banquet" | "stage";

const PALETTES: Record<Variant, { wall: [string, string]; accent: string; seat: string }> = {
  theatre: { wall: ["#eef2f7", "#cddaeb"], accent: "#003b95", seat: "#5f8fd1" },
  banquet: { wall: ["#0071c2", "#003b95"], accent: "#eef2f7", seat: "#6fa8dc" },
  stage: { wall: ["#005ea6", "#00265c"], accent: "#e6f0fb", seat: "#3d7ec2" },
};

export function PlaceholderArt({
  variant = "theatre",
  alt,
  className,
}: {
  variant?: Variant;
  alt: string;
  className?: string;
}) {
  const p = PALETTES[variant];
  const gid = `wall-${variant}`;
  return (
    <svg
      role="img"
      aria-label={alt}
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid slice"
      className={cn("block h-full w-full", className)}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.wall[0]} />
          <stop offset="1" stopColor={p.wall[1]} />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill={`url(#${gid})`} />
      {variant === "banquet" ? (
        <>
          {[0, 1].flatMap((row) =>
            [0, 1, 2].map((col) => {
              const cx = 80 + col * 120 + (row % 2) * 30;
              const cy = 120 + row * 90;
              return (
                <g key={`${row}-${col}`}>
                  {Array.from({ length: 8 }, (_, i) => {
                    const a = (i / 8) * Math.PI * 2;
                    return (
                      <circle
                        key={i}
                        cx={cx + Math.cos(a) * 30}
                        cy={cy + Math.sin(a) * 30}
                        r="6"
                        fill={p.seat}
                      />
                    );
                  })}
                  <circle cx={cx} cy={cy} r="22" fill={p.accent} />
                </g>
              );
            }),
          )}
        </>
      ) : (
        <>
          <rect x="110" y="34" width="180" height="40" rx="4" fill={p.accent} opacity="0.9" />
          <rect x="150" y="42" width="100" height="24" rx="2" fill={p.wall[0]} />
          {Array.from({ length: 6 }, (_, r) => {
            const size = 16 + r * 3;
            const y = 100 + r * 32;
            return [-1, 1].flatMap((side) =>
              Array.from({ length: 5 }, (_, k) => (
                <rect
                  key={`${r}-${side}-${k}`}
                  x={200 + side * (24 + k * (size + 6)) - (side < 0 ? size : 0)}
                  y={y}
                  width={size}
                  height={size - 2}
                  rx="3"
                  fill={p.seat}
                />
              )),
            );
          })}
        </>
      )}
    </svg>
  );
}
