import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

window.onerror = function(msg, url, line, col, error) {
  const root = document.getElementById('root');
  if (root && root.innerHTML === '') {
    root.innerHTML = '<div style="padding: 20px; color: red; font-family: sans-serif;"><h3>Runtime Error</h3><p>' + msg + '</p><p>Line: ' + line + '</p></div>';
  }
  return false;
};

(function() {
  try {
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error('Root element not found');
    }
    
    if (createRoot) {
      createRoot(rootElement).render(
        React.createElement(React.StrictMode, null, React.createElement(App))
      );
    } else {
      throw new Error('ReactDOM.createRoot is not available');
    }
  } catch (error) {
    const root = document.getElementById('root');
    if (root) {
      root.innerHTML = '<div style="padding: 20px; color: red; font-family: sans-serif;"><h3>Initialization Error</h3><p>' + (error as Error).message + '</p></div>';
    }
  }
})();
