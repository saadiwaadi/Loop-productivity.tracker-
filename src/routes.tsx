import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppLayout from './App';
import HomeView from './features/home/HomeView';
import ProjectsView from './features/projects/ProjectsView';
import ProjectDetailView from './features/projects/ProjectDetailView';
import NotesView from './features/notes/NotesView';
import HabitsView from './features/habits/HabitsView';
import AnalyzerView from './features/analyzer/AnalyzerView';
import SettingsView from './features/settings/SettingsView';
import AuthView from './features/auth/AuthView';
import ProtectedRoute from './components/providers/ProtectedRoute';
import CalendarView from './features/calendar/CalendarView';
import HealthHomeView from './features/health/HealthHomeView';
import ActivityView from './features/health/ActivityView';
import NutritionView from './features/health/NutritionView';
import SleepView from './features/health/SleepView';
import BodyView from './features/health/BodyView';
import HealthReportView from './features/health/HealthReportView';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <AuthView />,
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        path: '',
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
            path: 'projects/:id',
            element: <ProjectDetailView />,
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
            path: 'calendar',
            element: <CalendarView />,
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
            path: 'health',
            element: <HealthHomeView />,
          },
          {
            path: 'health/activity',
            element: <ActivityView />,
          },
          {
            path: 'health/nutrition',
            element: <NutritionView />,
          },
          {
            path: 'health/sleep',
            element: <SleepView />,
          },
          {
            path: 'health/body',
            element: <BodyView />,
          },
          {
            path: 'health/report',
            element: <HealthReportView />,
          },
          {
            path: '*',
            element: <Navigate to="/" replace />,
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

export default router;
