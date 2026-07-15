import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from './components/AuthProvider.tsx'
import router from './routes.tsx'
import './index.css'
import { db } from './db/db.ts'

async function runDiagnostic() {
  try {
    const logs = await db.habitLogs.toArray();
    
    const getDateString = (date: Date) => {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    const disagreeing = logs.filter(log => {
      const derived = getDateString(new Date(log.completedAt));
      return log.date !== derived;
    });

    const counts: Record<string, number> = {};
    logs.forEach(log => {
      const key = `${log.habitId}_${log.date}`;
      counts[key] = (counts[key] || 0) + 1;
    });

    const duplicates = Object.keys(counts).filter(key => counts[key] > 1);
    const duplicateExamples = duplicates.map(key => {
      const [habitId, date] = key.split('_');
      return { habitId: parseInt(habitId), date, count: counts[key] };
    });

    // Render results directly in the DOM for visibility
    const div = document.createElement('div');
    div.id = 'diagnostic-banner';
    div.style.position = 'fixed';
    div.style.top = '10px';
    div.style.left = '50%';
    div.style.transform = 'translateX(-50%)';
    div.style.backgroundColor = '#1e1e2e';
    div.style.color = '#cdd6f4';
    div.style.border = '2px solid #fab387';
    div.style.borderRadius = '8px';
    div.style.padding = '15px';
    div.style.zIndex = '99999';
    div.style.boxShadow = '0 4px 15px rgba(0,0,0,0.5)';
    div.style.fontFamily = 'monospace';
    div.style.fontSize = '12px';
    div.style.maxWidth = '90%';
    div.style.maxHeight = '80vh';
    div.style.overflow = 'auto';

    div.innerHTML = `
      <div style="font-weight: bold; color: #fab387; margin-bottom: 8px;">=== HABIT LOGS DIAGNOSTIC ===</div>
      <div>Total logs: ${logs.length}</div>
      <div>Disagreeing logs: ${disagreeing.length}</div>
      ${disagreeing.length > 0 ? `<pre style="background: #11111b; padding: 5px; border-radius: 4px;">${JSON.stringify(disagreeing.slice(0, 5), null, 2)}</pre>` : ''}
      <div>Duplicate habitId/date entries: ${duplicates.length}</div>
      ${duplicates.length > 0 ? `<pre style="background: #11111b; padding: 5px; border-radius: 4px;">${JSON.stringify(duplicateExamples.slice(0, 5), null, 2)}</pre>` : ''}
      <button onclick="document.getElementById('diagnostic-banner').remove()" style="margin-top: 10px; padding: 4px 8px; cursor: pointer; background: #fab387; color: #11111b; border: none; border-radius: 4px; font-weight: bold;">Close</button>
    `;
    document.body.appendChild(div);

    console.log("=== DIAGNOSTIC DONE ===", {
      totalLogs: logs.length,
      disagreeingCount: disagreeing.length,
      duplicatesCount: duplicates.length
    });
  } catch (err) {
    console.error("Diagnostic failed:", err);
  }
}
runDiagnostic();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
)

