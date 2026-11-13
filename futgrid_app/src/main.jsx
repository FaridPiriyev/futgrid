import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import favicon from './assets/icons/favicon-32.png'
import appleIcon from './assets/icons/apple-touch-icon.png'

for (const old of document.head.querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"]')) old.remove()
for (const [rel, href, sizes] of [
  ['icon', favicon, '32x32'],
  ['apple-touch-icon', appleIcon, '180x180'],
]) {
  const link = document.createElement('link')
  link.rel = rel
  link.href = href
  link.setAttribute('sizes', sizes)
  if (rel === 'icon') link.type = 'image/png'
  document.head.appendChild(link)
}
if (!document.head.querySelector('meta[name="theme-color"]')) {
  const meta = document.createElement('meta')
  meta.name = 'theme-color'
  meta.content = '#0b1430'
  document.head.appendChild(meta)
}

const FONTS =
  'https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@300;400;600;700;800;900&family=Roboto:wght@400;500;700&display=swap'

if (!document.querySelector('link[href^="https://fonts.googleapis.com/css2"]')) {
  for (const [rel, href, cors] of [
    ['preconnect', 'https://fonts.googleapis.com'],
    ['preconnect', 'https://fonts.gstatic.com', true],
    ['stylesheet', FONTS],
  ]) {
    const link = document.createElement('link')
    link.rel = rel
    link.href = href
    if (cors) link.crossOrigin = ''
    document.head.appendChild(link)
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
