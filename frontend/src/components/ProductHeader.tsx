import { StarIcon } from './StarIcon';

interface Props {
  name: string;
  category: string;
  priceCents: number;
  averageRating: number | null;
  reviewCount: number;
  wide: boolean;
}

export function ProductHeader({ name, category, priceCents, averageRating, reviewCount, wide }: Props) {
  return (
    <div className="border-b border-border-subtle bg-surface">
      <div className={`mx-auto flex items-center gap-5 px-8 py-5 ${wide ? 'max-w-[1120px]' : 'max-w-[760px]'}`}>
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-accent-bg">
          <span className="font-sora text-[22px] font-extrabold text-accent">
            {name.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <div className="text-xs tracking-wide text-text-tertiary uppercase">{category}</div>
          <div className="flex flex-wrap items-baseline gap-4">
            <h1 className="font-sora m-0 text-xl font-bold text-text-primary">{name}</h1>
            <div className="text-lg font-bold text-text-primary">${(priceCents / 100).toFixed(2)}</div>
          </div>
          {reviewCount > 0 && (
            <div className="flex items-center gap-1.5">
              <StarIcon filled size={15} />
              <span className="text-sm text-text-secondary">
                {averageRating?.toFixed(1)} · {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
