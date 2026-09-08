interface Props {
  filled: boolean;
  size?: number;
}

export function StarIcon({ filled, size = 16 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <polygon
        points="12 2 14.9 8.6 22 9.3 16.5 14.1 18.2 21 12 17.1 5.8 21 7.5 14.1 2 9.3 9.1 8.6"
        className={filled ? 'fill-star-fill' : 'fill-star-empty'}
      />
    </svg>
  );
}
