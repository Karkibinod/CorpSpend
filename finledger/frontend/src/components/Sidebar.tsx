import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CreditCard, 
  ArrowLeftRight, 
  Receipt, 
  Shield,
  TrendingUp,
  Settings,
  HelpCircle
} from 'lucide-react';

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
  return (
    <aside className="fixed left-0 top-0 h-screen w-72 bg-obsidian-900/50 backdrop-blur-xl border-r border-obsidian-700/50 flex flex-col z-50">
      {/* Logo */}
      <div className="p-6 border-b border-obsidian-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-vault-500 to-vault-600 flex items-center justify-center shadow-lg shadow-vault-500/25">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold text-white tracking-tight">
              FinLedger
            </h1>
            <p className="text-xs text-obsidian-400">Corporate Spend Platform</p>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        <p className="px-4 py-2 text-xs font-semibold text-obsidian-500 uppercase tracking-wider">
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
        <div className="mt-6 mx-4 p-4 rounded-xl bg-gradient-to-br from-vault-500/10 to-vault-600/5 border border-vault-500/20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-vault-500/20 flex items-center justify-center">
              <Shield className="w-4 h-4 text-vault-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-vault-300">Fraud Protection</p>
              <p className="text-xs text-vault-500">Active & Monitoring</p>
            </div>
          </div>
        </div>
      </nav>

      {/* Secondary Navigation */}
      <div className="p-4 border-t border-obsidian-700/50 space-y-1">
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
      <div className="p-4 border-t border-obsidian-700/50">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-obsidian-800/50">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center text-obsidian-900 font-bold">
            FL
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-obsidian-100 truncate">Finance Lead</p>
            <p className="text-xs text-obsidian-400 truncate">admin@finledger.io</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

