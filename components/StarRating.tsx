import { Star } from "lucide-react";

/** Read-only star display supporting fractional values (e.g. 4.3 / 5). */
export function StarRating({
  value,
  size = 16,
  className = "",
}: {
  value: number;
  size?: number;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  const stars = [0, 1, 2, 3, 4];

  return (
    <span
      className={`star-rating ${className}`.trim()}
      role="img"
      aria-label={`${value.toFixed(1)} sur 5`}
    >
      <span className="star-rating-track" aria-hidden>
        {stars.map((i) => (
          <Star key={i} size={size} strokeWidth={1.5} />
        ))}
      </span>
      <span className="star-rating-fill" style={{ width: `${pct}%` }} aria-hidden>
        {stars.map((i) => (
          <Star key={i} size={size} strokeWidth={1.5} fill="currentColor" />
        ))}
      </span>
    </span>
  );
}
