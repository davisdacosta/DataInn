export function SplashLoader({ label = 'Loading DataInn' }) {
  return (
    <div className="splash-loader" role="status" aria-live="polite">
      <div className="splash-loader-content">
        <div className="splash-loader-mark" aria-hidden="true">
          <span className="splash-ripple splash-ripple-one" />
          <span className="splash-ripple splash-ripple-two" />
          <span className="splash-ripple splash-ripple-three" />
          <img src="/assets/new-favicon-datainn-removebg-preview.png" alt="" />
        </div>
        <p>{label}</p>
      </div>
    </div>
  );
}