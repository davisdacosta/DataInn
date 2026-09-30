export function CatalogSkeleton({ variant = 'checkout' }) {
  const isHome = variant === 'home';

  return (
    <div
      className={`catalog-skeleton catalog-skeleton-${variant}`}
      role="status"
      aria-label="Loading bundle catalog"
    >
      {Array.from({ length: 3 }, (_, index) => (
        <div className="catalog-skeleton-item" key={index} aria-hidden="true">
          {isHome && <span className="catalog-skeleton-index catalog-skeleton-block" />}
          <span className="catalog-skeleton-symbol catalog-skeleton-block" />
          <span className="catalog-skeleton-copy">
            <span className="catalog-skeleton-title catalog-skeleton-block" />
            <span className="catalog-skeleton-detail catalog-skeleton-block" />
          </span>
          <span className={`${isHome ? 'catalog-skeleton-arrow' : 'catalog-skeleton-radio'} catalog-skeleton-block`} />
        </div>
      ))}
    </div>
  );
}