import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CreditCard, 
  ArrowLeftRight, 
  Receipt, 
  Shield,
  TrendingUp,
  Settings,
  HelpCircle,
  LogOut
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Cards', href: '/cards', icon: CreditCard },
  { name: 'Transactions', href: '/transactions', icon: ArrowLeftRight },
  { name: 'Receipts', href: '/receipts', icon: Receipt },
];

const secondaryNav = [
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Help', href: '/help', icon: HelpCircle },
];

export default function Sidebar() {
  const { resolvedMode } = useTheme();
  const { user, logout } = useAuth();
  
  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'CS';
  
  return (
    <aside className={`fixed left-0 top-0 h-screen w-72 backdrop-blur-xl border-r flex flex-col z-50 ${
      resolvedMode === 'dark' 
        ? 'bg-obsidian-900/50 border-obsidian-700/50' 
        : 'bg-white/80 border-gray-200'
    }`}>
      {/* Logo */}
      <div className={`p-6 border-b ${resolvedMode === 'dark' ? 'border-obsidian-700/50' : 'border-gray-200'}`}>
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
            style={{ 
              background: `linear-gradient(to bottom right, rgb(var(--accent-primary)), rgb(var(--accent-hover)))`,
              boxShadow: `0 10px 25px -5px rgba(var(--accent-glow), 0.25)`
            }}
          >
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className={`text-xl font-display font-bold tracking-tight ${resolvedMode === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              CorpSpend
            </h1>
            <p className={`text-xs ${resolvedMode === 'dark' ? 'text-obsidian-400' : 'text-gray-500'}`}>The Autonomous Finance Platform</p>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        <p className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider ${resolvedMode === 'dark' ? 'text-obsidian-500' : 'text-gray-400'}`}>
          Main Menu
        </p>
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              isActive ? 'sidebar-link-active' : 'sidebar-link'
            }
          >
            <item.icon className="w-5 h-5" />
            <span>{item.name}</span>
          </NavLink>
        ))}

        {/* Fraud Protection Badge */}
        <div 
          className="mt-6 mx-4 p-4 rounded-xl border"
          style={{ 
            background: `linear-gradient(to bottom right, rgba(var(--accent-primary), 0.1), rgba(var(--accent-primary), 0.05))`,
            borderColor: `rgba(var(--accent-primary), 0.2)`
          }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `rgba(var(--accent-primary), 0.2)` }}
            >
              <Shield className="w-4 h-4" style={{ color: `rgb(var(--accent-primary))` }} />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: `rgb(var(--accent-primary))` }}>Fraud Protection</p>
              <p className={`text-xs ${resolvedMode === 'dark' ? 'text-obsidian-400' : 'text-gray-500'}`}>Active & Monitoring</p>
            </div>
          </div>
        </div>
      </nav>

      {/* Secondary Navigation */}
      <div className={`p-4 border-t space-y-1 ${resolvedMode === 'dark' ? 'border-obsidian-700/50' : 'border-gray-200'}`}>
        {secondaryNav.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              isActive ? 'sidebar-link-active' : 'sidebar-link'
            }
          >
            <item.icon className="w-5 h-5" />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </div>

      {/* User Profile */}
      <div className={`p-4 border-t ${resolvedMode === 'dark' ? 'border-obsidian-700/50' : 'border-gray-200'}`}>
        <div className={`flex items-center gap-3 p-3 rounded-xl ${resolvedMode === 'dark' ? 'bg-obsidian-800/50' : 'bg-gray-100'}`}>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-vault-400 to-vault-600 flex items-center justify-center text-white font-bold text-sm">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium truncate ${resolvedMode === 'dark' ? 'text-obsidian-100' : 'text-gray-900'}`}>
              {user?.name || 'Finance Lead'}
            </p>
            <p className={`text-xs truncate ${resolvedMode === 'dark' ? 'text-obsidian-400' : 'text-gray-500'}`}>
              {user?.email || 'admin@corpspend.io'}
            </p>
          </div>
          <button
            onClick={logout}
            className={`p-2 rounded-lg transition-colors ${
              resolvedMode === 'dark'
                ? 'hover:bg-obsidian-700 text-obsidian-400 hover:text-red-400'
                : 'hover:bg-gray-200 text-gray-400 hover:text-red-500'
            }`}
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
