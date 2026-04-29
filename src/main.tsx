import React from 'react';
import ReactDOM from 'react-dom';
import App from './App.tsx';
import './index.css';

window.onerror = function(msg, url, line, col, error) {
  const root = document.getElementById('root');
  if (root && root.innerHTML === '') {
    root.innerHTML = '<div style="padding: 20px; color: red; font-family: sans-serif;"><h3>Runtime Error</h3><p>' + msg + '</p><p>Line: ' + line + '</p></div>';
  }
  return false;
};

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found');
  }
  
  if (ReactDOM.createRoot) {
    ReactDOM.createRoot(rootElement).render(
      React.createElement(React.StrictMode, null, React.createElement(App))
    );
  } else {
    ReactDOM.render(
      React.createElement(React.StrictMode, null, React.createElement(App)),
      rootElement
    );
  }
} catch (error) {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = '<div style="padding: 20px; color: red; font-family: sans-serif;"><h3>Initialization Error</h3><p>' + (error as Error).message + '</p></div>';
  }
}
