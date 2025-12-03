import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-obsidian-950">
      {/* Background effects */}
      <div className="fixed inset-0 bg-grid-pattern pointer-events-none" />
      <div className="fixed inset-0 bg-radial-glow pointer-events-none" />
      
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

