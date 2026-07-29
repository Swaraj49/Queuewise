import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Toggle scrolled class on navbar for subtle shadow effect
window.addEventListener('scroll', () => {
  const navs = document.querySelectorAll('.dashboard-nav');
  if (window.scrollY > 10) {
    navs.forEach(nav => nav.classList.add('scrolled'));
  } else {
    navs.forEach(nav => nav.classList.remove('scrolled'));
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
