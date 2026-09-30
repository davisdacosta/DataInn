import { useEffect, useState } from 'react';
import { SiteLayout } from './components/SiteLayout.jsx';
import { SplashLoader } from './components/SplashLoader.jsx';
import { CheckoutPage } from './pages/CheckoutPage.jsx';
import { HomePage } from './pages/HomePage.jsx';
import { LegalPage } from './pages/LegalPage.jsx';
import { ResultPage } from './pages/ResultPage.jsx';
import { TrackPage } from './pages/TrackPage.jsx';
import { normalizePath } from './utils.js';

function readTheme() {
  try {
    const saved = localStorage.getItem('datainn-theme');
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {}
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function App() {
  const [theme, setTheme] = useState(readTheme);
  const [showStartupLoader, setShowStartupLoader] = useState(true);
  const path = normalizePath(window.location.pathname);
  const isResultPage = path === '/success' || path === '/failed';

  useEffect(() => {
    const timer = window.setTimeout(() => setShowStartupLoader(false), 1400);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('datainn-theme', theme);
    } catch {}
  }, [theme]);

  useEffect(() => {
    const titles = {
      '/': 'Buy data bundles in Ghana | DataInn',
      '/buy': 'Buy data | DataInn',
      '/track': 'Track your order | DataInn',
      '/success': 'Order delivered | DataInn',
      '/failed': 'Order status | DataInn',
      '/privacy': 'Privacy Policy | DataInn',
      '/terms': 'Terms of Service | DataInn',
    };
    document.title = titles[path] || 'DataInn | Data bundles in Ghana';
  }, [path]);

  let active = path;
  let page;
  if (path === '/') page = <HomePage />;
  else if (path === '/buy') page = <CheckoutPage />;
  else if (path === '/track') page = <TrackPage />;
  else if (path === '/success' || path === '/failed') page = <ResultPage kind={path.slice(1)} />;
  else if (path === '/privacy' || path === '/terms') page = <LegalPage kind={path.slice(1)} />;
  else {
    active = '/';
    page = <HomePage />;
  }

  return (
    <>
      <SiteLayout
        active={active}
        theme={theme}
        onToggleTheme={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}
      >
        {page}
      </SiteLayout>
      {showStartupLoader && !isResultPage && <SplashLoader />}
    </>
  );
}