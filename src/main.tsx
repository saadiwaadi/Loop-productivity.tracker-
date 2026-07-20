import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from './components/providers/AuthProvider.tsx'
import router from './routes.tsx'
import './index.css'

// Ask the browser not to evict IndexedDB/localStorage under storage
// pressure or idle-eviction policies (notably iOS Safari's ~7-day ITP
// eviction for installed PWAs). Without this, the local database can get
// silently recreated, which previously caused seeded/placeholder data and
// the theme preference to reappear on "fresh" opens.
if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
  navigator.storage.persist().catch(() => {});
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
)


