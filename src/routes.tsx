import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppLayout from './App';
import HomeView from './features/home/HomeView';
import ProjectsView from './features/projects/ProjectsView';
import NotesView from './features/notes/NotesView';
import HabitsView from './features/habits/HabitsView';
import AnalyzerView from './features/analyzer/AnalyzerView';
import SettingsView from './features/settings/SettingsView';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        path: '',
        element: <HomeView />,
      },
      {
        path: 'projects',
        element: <ProjectsView />,
      },
      {
        path: 'notes',
        element: <NotesView />,
      },
      {
        path: 'habits',
        element: <HabitsView />,
      },
      {
        path: 'analyzer',
        element: <AnalyzerView />,
      },
      {
        path: 'settings',
        element: <SettingsView />,
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);

export default router;
