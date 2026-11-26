import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { UiProvider } from './ui/UiContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <UiProvider>
      <App />
    </UiProvider>
  </React.StrictMode>
);
