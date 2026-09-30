import { ArrowUpRight, CircleHelp, House, Search, Smartphone } from 'lucide-react';
import { SiWhatsapp } from 'react-icons/si';
import logo from '../../assets/New-dataInn-logo.png';
import { ThemeToggle } from './ThemeToggle.jsx';

const SUPPORT_URL = 'https://wa.me/233240315280';
const WHATSAPP_CHANNEL_URL = 'https://whatsapp.com/channel/0029Vb82YJkId7nW9pP60K2D';

const links = [
  { href: '/', path: '/', label: 'Home', Icon: House },
  { href: '/buy.html', path: '/buy', label: 'Buy data', Icon: Smartphone },
  { href: '/track.html', path: '/track', label: 'Track', Icon: Search },
];

export function SiteLayout({ children, theme, onToggleTheme, active = '/' }) {
  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="header-inner">
          <a className="brand" href="/" aria-label="DataInn home">
            <img src={logo} alt="" />
            <span>data<span>inn</span></span>
          </a>
          <nav className="desktop-nav" aria-label="Main navigation">
            <a className={active === '/' ? 'active' : ''} href="/">Home</a>
            <a className={active === '/buy' ? 'active' : ''} href="/buy.html">Networks</a>
            <a href="/#how-it-works">How it works</a>
            <a className={active === '/track' ? 'active' : ''} href="/track.html">Track order</a>
          </nav>
          <div className="header-actions">
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
            <a className="button button-small button-ink" href="/buy.html">Buy data <ArrowUpRight size={16} /></a>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="site-footer">
        <div className="footer-inner">
          <a className="brand brand-footer" href="/">
            <img src={logo} alt="" />
            <span>data<span>inn</span></span>
          </a>
          <p>More data. Less waiting.</p>
          <a href={SUPPORT_URL} target="_blank" rel="noreferrer"><CircleHelp size={16} /> Help centre</a>
          <a href="/privacy.html">Privacy Policy</a>
          <a href="/terms.html">Terms of Service</a>
          <small>© 2026 DataInn · Payments secured by Paystack</small>
        </div>
      </footer>

      <a
        className="whatsapp-link"
        href={WHATSAPP_CHANNEL_URL}
        target="_blank"
        rel="noreferrer"
        aria-label="Join the DataInn WhatsApp channel"
        data-tooltip="Join Our Channel"
      >
        <SiWhatsapp className="whatsapp-icon" aria-hidden="true" />
      </a>

      <nav className="mobile-nav" aria-label="Primary navigation">
        {links.map(({ href, path, label, Icon }) => (
          <a key={path} href={href} className={active === path ? 'active' : ''} aria-current={active === path ? 'page' : undefined}>
            <Icon size={20} strokeWidth={1.9} />
            <span>{label}</span>
          </a>
        ))}
        <a href="/#faq"><CircleHelp size={20} strokeWidth={1.9} /><span>Help</span></a>
      </nav>
    </div>
  );
}