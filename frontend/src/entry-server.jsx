import { renderToString } from 'react-dom/server';
import App from './App.jsx';

export function renderPage(path) {
  return renderToString(<App initialPath={path} />);
}
