export function InitialsAvatar({
  name,
  hue = 220,
  size = 32,
}: {
  name: string;
  hue?: number;
  size?: number;
}) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: `linear-gradient(135deg, hsl(${hue} 70% 55%), hsl(${hue + 40} 70% 45%))`,
      }}
    >
      {initials}
    </div>
  );
}
