import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useTheme } from '../context/ThemeContext';

export default function Layout() {
  const { resolvedMode } = useTheme();
  
  return (
    <div className={`flex min-h-screen ${resolvedMode === 'dark' ? 'bg-obsidian-950' : 'bg-gray-50'}`}>
      {/* Background effects */}
      {resolvedMode === 'dark' && (
        <>
          <div className="fixed inset-0 bg-grid-pattern pointer-events-none" />
          <div className="fixed inset-0 bg-radial-glow pointer-events-none" />
        </>
      )}
      
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main content */}
      <main className="flex-1 ml-72 relative">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

