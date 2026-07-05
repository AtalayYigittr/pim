import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

window.addEventListener('error', (e) => {
  const root = document.getElementById('root');
  if (root && root.innerHTML === '') {
    root.innerHTML = `<div style="padding:20px;font-family:monospace;color:red;background:#fff;white-space:pre-wrap">
      <h2>Uygulama Hatası</h2><pre>${e.message}\n${e.filename}:${e.lineno}</pre>
    </div>`;
  }
});

const rootElement = document.getElementById('root')!;
ReactDOM.createRoot(rootElement).render(
  <React.StrictMode><App /></React.StrictMode>
);
