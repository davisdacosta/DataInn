import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = resolve(frontendRoot, 'dist');
const routes = [
  {
    path: '/',
    source: 'index.html',
    title: 'Buy data bundles in Ghana | DataInn',
    description: 'Buy MTN, Telecel and AirtelTigo data bundles for any Ghanaian number. Secure checkout, no account needed.',
  },
  {
    path: '/buy',
    source: 'buy.html',
    title: 'Buy data | DataInn',
    description: 'Choose a data bundle and send it to any Ghanaian number with DataInn.',
  },
  {
    path: '/track',
    source: 'track.html',
    title: 'Track your order | DataInn',
    description: 'Check the payment and delivery status of your DataInn order.',
    robots: 'noindex,follow',
  },
  {
    path: '/success',
    source: 'success.html',
    title: 'Order delivered | DataInn',
    description: 'View your DataInn data bundle order status.',
    robots: 'noindex,follow',
  },
  {
    path: '/failed',
    source: 'failed.html',
    title: 'Order status | DataInn',
    description: 'View your DataInn data bundle order status.',
    robots: 'noindex,follow',
  },
  {
    path: '/privacy',
    source: 'privacy.html',
    title: 'Privacy Policy | DataInn',
    description: 'Learn how DataInn handles order and payment information.',
  },
  {
    path: '/terms',
    source: 'terms.html',
    title: 'Terms of Service | DataInn',
    description: 'Read the terms that apply when you use DataInn.',
  },
];

function escapeAttribute(value) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
}

function setHeadTag(html, pattern, tag, anchorPattern) {
  if (pattern.test(html)) return html.replace(pattern, tag);
  return html.replace(anchorPattern, (anchor) => `${anchor}\n    ${tag}`);
}

const vite = await createServer({
  configFile: resolve(frontendRoot, 'vite.config.js'),
  server: { middlewareMode: true },
  appType: 'custom',
});

try {
  const { renderPage } = await vite.ssrLoadModule('/src/entry-server.jsx');

  for (const route of routes) {
    let html = await readFile(resolve(distRoot, route.source), 'utf8');
    const rootMarkup = renderPage(route.path);
    if (!html.includes('<div id="root"></div>')) {
      throw new Error(`Could not find the root element in ${route.source}`);
    }

    html = html.replace('<div id="root"></div>', `<div id="root">${rootMarkup}</div>`);
    html = html.replace(/<title>[^<]*<\/title>/i, `<title>${route.title}</title>`);
    html = setHeadTag(
      html,
      /<meta\s+name="description"[^>]*>/i,
      `<meta name="description" content="${escapeAttribute(route.description)}" />`,
      /<meta\s+name="theme-color"[^>]*>/i,
    );

    const canonical = `https://datainn.onrender.com${route.path}`;
    html = setHeadTag(
      html,
      /<link\s+rel="canonical"[^>]*>/i,
      `<link rel="canonical" href="${canonical}" />`,
      /<meta\s+name="description"[^>]*>/i,
    );

    if (route.robots) {
      html = setHeadTag(
        html,
        /<meta\s+name="robots"[^>]*>/i,
        `<meta name="robots" content="${route.robots}" />`,
        /<meta\s+name="description"[^>]*>/i,
      );
    }

    const cleanRouteFile = route.path === '/'
      ? resolve(distRoot, 'index.html')
      : resolve(distRoot, route.path.slice(1), 'index.html');
    await mkdir(dirname(cleanRouteFile), { recursive: true });
    await writeFile(cleanRouteFile, html);

    if (route.path !== '/') {
      await writeFile(resolve(distRoot, route.source), html);
    }
  }
} finally {
  await vite.close();
}
