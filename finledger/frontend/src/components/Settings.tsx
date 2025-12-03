import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Bell, 
  CreditCard, 
  Users, 
  Lock,
  Globe,
  Palette,
  Save,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  Mail,
  Smartphone,
  Building2,
  FileText,
  Sun,
  Moon,
  Monitor
} from 'lucide-react';
import { useTheme, ThemeMode, AccentColor } from '../context/ThemeContext';

interface SettingsSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
}

const sections: SettingsSection[] = [
  { id: 'fraud', title: 'Fraud Protection', icon: <Shield className="w-5 h-5" />, description: 'Configure fraud detection rules' },
  { id: 'notifications', title: 'Notifications', icon: <Bell className="w-5 h-5" />, description: 'Manage alert preferences' },
  { id: 'cards', title: 'Card Policies', icon: <CreditCard className="w-5 h-5" />, description: 'Default card settings' },
  { id: 'company', title: 'Company', icon: <Building2 className="w-5 h-5" />, description: 'Organization details' },
  { id: 'security', title: 'Security', icon: <Lock className="w-5 h-5" />, description: 'Authentication & access' },
  { id: 'appearance', title: 'Appearance', icon: <Palette className="w-5 h-5" />, description: 'Theme & display' },
];

export default function Settings() {
  const [activeSection, setActiveSection] = useState('fraud');
  const [saved, setSaved] = useState(false);
  const { settings: themeSettings, updateSettings: updateTheme, resolvedMode } = useTheme();
  
  // Fraud settings
  const [fraudSettings, setFraudSettings] = useState({
    maxTransactionAmount: 5000,
    enableVelocityCheck: true,
    maxTransactionsPerMinute: 10,
    enableBlacklist: true,
    blacklistedMerchants: 'SUSPICIOUS_VENDOR_1\nBLACKLISTED_MERCHANT\nFRAUD_CORP\nSCAM_ENTERPRISES',
    autoBlockHighRisk: true,
    riskThreshold: 0.7,
  });

  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailAlerts: true,
    smsAlerts: false,
    pushNotifications: true,
    transactionAlerts: true,
    fraudAlerts: true,
    weeklyReports: true,
    monthlyReports: true,
    alertEmail: 'admin@corpspend.io',
    alertPhone: '+1 (555) 123-4567',
  });

  // Card policy settings
  const [cardSettings, setCardSettings] = useState({
    defaultSpendingLimit: 10000,
    maxSpendingLimit: 100000,
    requireApprovalAbove: 25000,
    allowInternational: true,
    allowOnline: true,
    allowAtm: false,
    autoFreezeOnFraud: true,
    expiryMonths: 36,
  });

  // Company settings
  const [companySettings, setCompanySettings] = useState({
    companyName: 'Acme Corporation',
    billingEmail: 'billing@acme.com',
    timezone: 'America/New_York',
    currency: 'USD',
    fiscalYearStart: 'January',
  });

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const renderFraudSettings = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3 p-4 rounded-xl bg-vault-500/10 border border-vault-500/20">
        <Shield className="w-6 h-6 text-vault-400" />
        <div>
          <p className="font-medium text-vault-300">Fraud Protection Active</p>
          <p className="text-sm text-vault-500">All transactions are monitored in real-time</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="label flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-obsidian-400" />
            Maximum Transaction Amount
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-obsidian-400">$</span>
            <input
              type="number"
              value={fraudSettings.maxTransactionAmount}
              onChange={(e) => setFraudSettings({ ...fraudSettings, maxTransactionAmount: parseInt(e.target.value) })}
              className="input-field pl-8"
            />
          </div>
          <p className="text-xs text-obsidian-500 mt-1">Transactions above this amount will be blocked</p>
        </div>

        <div>
          <label className="label">Risk Score Threshold</label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0"
              max="100"
              value={fraudSettings.riskThreshold * 100}
              onChange={(e) => setFraudSettings({ ...fraudSettings, riskThreshold: parseInt(e.target.value) / 100 })}
              className="flex-1 h-2 bg-obsidian-700 rounded-full appearance-none cursor-pointer accent-vault-500"
            />
            <span className="font-mono text-sm text-obsidian-300 w-12">{(fraudSettings.riskThreshold * 100).toFixed(0)}%</span>
          </div>
          <p className="text-xs text-obsidian-500 mt-1">Transactions above this risk score will be flagged</p>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-obsidian-300 uppercase tracking-wide">Velocity Controls</h4>
        
        <label className="flex items-center justify-between p-4 rounded-xl bg-obsidian-800/50 cursor-pointer hover:bg-obsidian-800 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="font-medium text-obsidian-100">Enable Velocity Check</p>
              <p className="text-sm text-obsidian-400">Detect rapid successive transactions</p>
            </div>
          </div>
          <div className="relative">
            <input
              type="checkbox"
              checked={fraudSettings.enableVelocityCheck}
              onChange={(e) => setFraudSettings({ ...fraudSettings, enableVelocityCheck: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-obsidian-600 rounded-full peer peer-checked:bg-vault-500 transition-colors" />
            <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
          </div>
        </label>

        {fraudSettings.enableVelocityCheck && (
          <div className="ml-4 p-4 border-l-2 border-obsidian-700">
            <label className="label">Max Transactions Per Minute</label>
            <input
              type="number"
              value={fraudSettings.maxTransactionsPerMinute}
              onChange={(e) => setFraudSettings({ ...fraudSettings, maxTransactionsPerMinute: parseInt(e.target.value) })}
              className="input-field max-w-xs"
              min="1"
              max="100"
            />
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-obsidian-300 uppercase tracking-wide">Merchant Blacklist</h4>
        
        <label className="flex items-center justify-between p-4 rounded-xl bg-obsidian-800/50 cursor-pointer hover:bg-obsidian-800 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="font-medium text-obsidian-100">Enable Merchant Blacklist</p>
              <p className="text-sm text-obsidian-400">Block transactions to known bad merchants</p>
            </div>
          </div>
          <div className="relative">
            <input
              type="checkbox"
              checked={fraudSettings.enableBlacklist}
              onChange={(e) => setFraudSettings({ ...fraudSettings, enableBlacklist: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-obsidian-600 rounded-full peer peer-checked:bg-vault-500 transition-colors" />
            <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
          </div>
        </label>

        {fraudSettings.enableBlacklist && (
          <div className="ml-4 p-4 border-l-2 border-obsidian-700">
            <label className="label">Blacklisted Merchants (one per line)</label>
            <textarea
              value={fraudSettings.blacklistedMerchants}
              onChange={(e) => setFraudSettings({ ...fraudSettings, blacklistedMerchants: e.target.value })}
              className="input-field font-mono text-sm h-32 resize-none"
              placeholder="SUSPICIOUS_VENDOR&#10;BLACKLISTED_MERCHANT"
            />
          </div>
        )}
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="label flex items-center gap-2">
            <Mail className="w-4 h-4 text-obsidian-400" />
            Alert Email Address
          </label>
          <input
            type="email"
            value={notificationSettings.alertEmail}
            onChange={(e) => setNotificationSettings({ ...notificationSettings, alertEmail: e.target.value })}
            className="input-field"
          />
        </div>

        <div>
          <label className="label flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-obsidian-400" />
            Alert Phone Number
          </label>
          <input
            type="tel"
            value={notificationSettings.alertPhone}
            onChange={(e) => setNotificationSettings({ ...notificationSettings, alertPhone: e.target.value })}
            className="input-field"
          />
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-obsidian-300 uppercase tracking-wide">Notification Channels</h4>
        
        {[
          { key: 'emailAlerts', label: 'Email Alerts', desc: 'Receive alerts via email', icon: Mail },
          { key: 'smsAlerts', label: 'SMS Alerts', desc: 'Receive alerts via text message', icon: Smartphone },
          { key: 'pushNotifications', label: 'Push Notifications', desc: 'Browser push notifications', icon: Bell },
        ].map((item) => (
          <label key={item.key} className="flex items-center justify-between p-4 rounded-xl bg-obsidian-800/50 cursor-pointer hover:bg-obsidian-800 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-obsidian-700 flex items-center justify-center">
                <item.icon className="w-5 h-5 text-obsidian-300" />
              </div>
              <div>
                <p className="font-medium text-obsidian-100">{item.label}</p>
                <p className="text-sm text-obsidian-400">{item.desc}</p>
              </div>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={notificationSettings[item.key as keyof typeof notificationSettings] as boolean}
                onChange={(e) => setNotificationSettings({ ...notificationSettings, [item.key]: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-obsidian-600 rounded-full peer peer-checked:bg-vault-500 transition-colors" />
              <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
            </div>
          </label>
        ))}
      </div>

      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-obsidian-300 uppercase tracking-wide">Alert Types</h4>
        
        {[
          { key: 'transactionAlerts', label: 'Transaction Alerts', desc: 'Get notified for all transactions' },
          { key: 'fraudAlerts', label: 'Fraud Alerts', desc: 'Immediate alerts for suspicious activity' },
          { key: 'weeklyReports', label: 'Weekly Reports', desc: 'Spending summary every week' },
          { key: 'monthlyReports', label: 'Monthly Reports', desc: 'Detailed monthly analysis' },
        ].map((item) => (
          <label key={item.key} className="flex items-center justify-between p-4 rounded-xl bg-obsidian-800/50 cursor-pointer hover:bg-obsidian-800 transition-colors">
            <div>
              <p className="font-medium text-obsidian-100">{item.label}</p>
              <p className="text-sm text-obsidian-400">{item.desc}</p>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={notificationSettings[item.key as keyof typeof notificationSettings] as boolean}
                onChange={(e) => setNotificationSettings({ ...notificationSettings, [item.key]: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-obsidian-600 rounded-full peer peer-checked:bg-vault-500 transition-colors" />
              <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
            </div>
          </label>
        ))}
      </div>
    </div>
  );

  const renderCardSettings = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="label">Default Spending Limit</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-obsidian-400">$</span>
            <input
              type="number"
              value={cardSettings.defaultSpendingLimit}
              onChange={(e) => setCardSettings({ ...cardSettings, defaultSpendingLimit: parseInt(e.target.value) })}
              className="input-field pl-8"
            />
          </div>
        </div>

        <div>
          <label className="label">Maximum Spending Limit</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-obsidian-400">$</span>
            <input
              type="number"
              value={cardSettings.maxSpendingLimit}
              onChange={(e) => setCardSettings({ ...cardSettings, maxSpendingLimit: parseInt(e.target.value) })}
              className="input-field pl-8"
            />
          </div>
        </div>

        <div>
          <label className="label">Require Approval Above</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-obsidian-400">$</span>
            <input
              type="number"
              value={cardSettings.requireApprovalAbove}
              onChange={(e) => setCardSettings({ ...cardSettings, requireApprovalAbove: parseInt(e.target.value) })}
              className="input-field pl-8"
            />
          </div>
          <p className="text-xs text-obsidian-500 mt-1">Cards with limits above this require manager approval</p>
        </div>

        <div>
          <label className="label">Card Expiry (Months)</label>
          <input
            type="number"
            value={cardSettings.expiryMonths}
            onChange={(e) => setCardSettings({ ...cardSettings, expiryMonths: parseInt(e.target.value) })}
            className="input-field"
            min="12"
            max="60"
          />
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-obsidian-300 uppercase tracking-wide">Transaction Types</h4>
        
        {[
          { key: 'allowOnline', label: 'Allow Online Purchases', desc: 'Enable e-commerce transactions' },
          { key: 'allowInternational', label: 'Allow International', desc: 'Enable cross-border transactions' },
          { key: 'allowAtm', label: 'Allow ATM Withdrawals', desc: 'Enable cash withdrawals' },
          { key: 'autoFreezeOnFraud', label: 'Auto-Freeze on Fraud', desc: 'Automatically freeze card when fraud detected' },
        ].map((item) => (
          <label key={item.key} className="flex items-center justify-between p-4 rounded-xl bg-obsidian-800/50 cursor-pointer hover:bg-obsidian-800 transition-colors">
            <div>
              <p className="font-medium text-obsidian-100">{item.label}</p>
              <p className="text-sm text-obsidian-400">{item.desc}</p>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={cardSettings[item.key as keyof typeof cardSettings] as boolean}
                onChange={(e) => setCardSettings({ ...cardSettings, [item.key]: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-obsidian-600 rounded-full peer peer-checked:bg-vault-500 transition-colors" />
              <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
            </div>
          </label>
        ))}
      </div>
    </div>
  );

  const renderCompanySettings = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label className="label flex items-center gap-2">
            <Building2 className="w-4 h-4 text-obsidian-400" />
            Company Name
          </label>
          <input
            type="text"
            value={companySettings.companyName}
            onChange={(e) => setCompanySettings({ ...companySettings, companyName: e.target.value })}
            className="input-field"
          />
        </div>

        <div>
          <label className="label flex items-center gap-2">
            <Mail className="w-4 h-4 text-obsidian-400" />
            Billing Email
          </label>
          <input
            type="email"
            value={companySettings.billingEmail}
            onChange={(e) => setCompanySettings({ ...companySettings, billingEmail: e.target.value })}
            className="input-field"
          />
        </div>

        <div>
          <label className="label flex items-center gap-2">
            <Globe className="w-4 h-4 text-obsidian-400" />
            Timezone
          </label>
          <select
            value={companySettings.timezone}
            onChange={(e) => setCompanySettings({ ...companySettings, timezone: e.target.value })}
            className="input-field"
          >
            <option value="America/New_York">Eastern Time (ET)</option>
            <option value="America/Chicago">Central Time (CT)</option>
            <option value="America/Denver">Mountain Time (MT)</option>
            <option value="America/Los_Angeles">Pacific Time (PT)</option>
            <option value="Europe/London">London (GMT)</option>
            <option value="Europe/Paris">Paris (CET)</option>
            <option value="Asia/Tokyo">Tokyo (JST)</option>
          </select>
        </div>

        <div>
          <label className="label flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-obsidian-400" />
            Currency
          </label>
          <select
            value={companySettings.currency}
            onChange={(e) => setCompanySettings({ ...companySettings, currency: e.target.value })}
            className="input-field"
          >
            <option value="USD">USD - US Dollar</option>
            <option value="EUR">EUR - Euro</option>
            <option value="GBP">GBP - British Pound</option>
            <option value="CAD">CAD - Canadian Dollar</option>
            <option value="AUD">AUD - Australian Dollar</option>
          </select>
        </div>

        <div>
          <label className="label flex items-center gap-2">
            <FileText className="w-4 h-4 text-obsidian-400" />
            Fiscal Year Starts
          </label>
          <select
            value={companySettings.fiscalYearStart}
            onChange={(e) => setCompanySettings({ ...companySettings, fiscalYearStart: e.target.value })}
            className="input-field"
          >
            {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(month => (
              <option key={month} value={month}>{month}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <div className="p-6 rounded-xl bg-obsidian-800/50 border border-obsidian-700">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-vault-500/20 flex items-center justify-center">
            <Lock className="w-6 h-6 text-vault-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Two-Factor Authentication</h3>
            <p className="text-sm text-obsidian-400">Add an extra layer of security to your account</p>
          </div>
        </div>
        <button className="btn-primary">Enable 2FA</button>
      </div>

      <div className="p-6 rounded-xl bg-obsidian-800/50 border border-obsidian-700">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <Users className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Active Sessions</h3>
            <p className="text-sm text-obsidian-400">Manage devices logged into your account</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-obsidian-900">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-vault-500" />
              <div>
                <p className="text-sm font-medium text-obsidian-100">Chrome on macOS</p>
                <p className="text-xs text-obsidian-400">Current session • San Francisco, CA</p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-obsidian-900">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-obsidian-500" />
              <div>
                <p className="text-sm font-medium text-obsidian-100">Safari on iPhone</p>
                <p className="text-xs text-obsidian-400">Last active 2 hours ago</p>
              </div>
            </div>
            <button className="text-sm text-red-400 hover:text-red-300">Revoke</button>
          </div>
        </div>
      </div>

      <div className="p-6 rounded-xl bg-red-500/10 border border-red-500/20">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h3 className="font-semibold text-red-300">Danger Zone</h3>
            <p className="text-sm text-red-400/70">Irreversible actions</p>
          </div>
        </div>
        <button className="btn-danger">Delete Organization</button>
      </div>
    </div>
  );

  const renderAppearanceSettings = () => {
    const themes: { id: ThemeMode; label: string; icon: React.ReactNode }[] = [
      { id: 'dark', label: 'Dark', icon: <Moon className="w-5 h-5" /> },
      { id: 'light', label: 'Light', icon: <Sun className="w-5 h-5" /> },
      { id: 'system', label: 'System', icon: <Monitor className="w-5 h-5" /> },
    ];

    const accentColors: { id: AccentColor; color: string; label: string }[] = [
      { id: 'green', color: 'bg-green-500', label: 'Green' },
      { id: 'blue', color: 'bg-blue-500', label: 'Blue' },
      { id: 'purple', color: 'bg-purple-500', label: 'Purple' },
      { id: 'orange', color: 'bg-orange-500', label: 'Orange' },
      { id: 'pink', color: 'bg-pink-500', label: 'Pink' },
    ];

    return (
      <div className="space-y-6">
        {/* Current Theme Indicator */}
        <div className={`p-4 rounded-xl ${resolvedMode === 'dark' ? 'bg-obsidian-800/50' : 'bg-gray-100'} border ${resolvedMode === 'dark' ? 'border-obsidian-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3">
            {resolvedMode === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            <div>
              <p className={`font-medium ${resolvedMode === 'dark' ? 'text-obsidian-100' : 'text-gray-900'}`}>
                Current Theme: {resolvedMode === 'dark' ? 'Dark Mode' : 'Light Mode'}
              </p>
              <p className={`text-sm ${resolvedMode === 'dark' ? 'text-obsidian-400' : 'text-gray-500'}`}>
                {themeSettings.mode === 'system' ? 'Following system preference' : 'Manually selected'}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className={`text-sm font-semibold uppercase tracking-wide ${resolvedMode === 'dark' ? 'text-obsidian-300' : 'text-gray-600'}`}>Theme Mode</h4>
          <div className="grid grid-cols-3 gap-4">
            {themes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => updateTheme({ mode: theme.id })}
                className={`p-4 rounded-xl border-2 transition-all ${
                  themeSettings.mode === theme.id
                    ? 'border-current bg-current/10'
                    : resolvedMode === 'dark' 
                      ? 'border-obsidian-700 bg-obsidian-800/50 hover:border-obsidian-600'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
                style={themeSettings.mode === theme.id ? { 
                  borderColor: `rgb(var(--accent-primary))`,
                  backgroundColor: `rgba(var(--accent-primary), 0.1)`
                } : {}}
              >
                <div className={`w-full h-16 rounded-lg mb-3 flex items-center justify-center ${
                  theme.id === 'dark' 
                    ? 'bg-obsidian-900 text-obsidian-400' 
                    : theme.id === 'light' 
                      ? 'bg-gray-100 text-gray-600' 
                      : 'bg-gradient-to-r from-obsidian-900 to-gray-100'
                }`}>
                  {theme.icon}
                </div>
                <p className={`text-sm font-medium ${
                  themeSettings.mode === theme.id 
                    ? '' 
                    : resolvedMode === 'dark' ? 'text-obsidian-300' : 'text-gray-600'
                }`}
                style={themeSettings.mode === theme.id ? { color: `rgb(var(--accent-primary))` } : {}}>
                  {theme.label}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h4 className={`text-sm font-semibold uppercase tracking-wide ${resolvedMode === 'dark' ? 'text-obsidian-300' : 'text-gray-600'}`}>Accent Color</h4>
          <div className="flex flex-wrap gap-3">
            {accentColors.map((item) => (
              <button
                key={item.id}
                onClick={() => updateTheme({ accent: item.id })}
                className={`group flex flex-col items-center gap-2 p-3 rounded-xl transition-all ${
                  themeSettings.accent === item.id
                    ? resolvedMode === 'dark' ? 'bg-obsidian-800' : 'bg-gray-100'
                    : 'hover:bg-obsidian-800/50'
                }`}
                title={item.label}
              >
                <div className={`w-10 h-10 rounded-full ${item.color} ${
                  themeSettings.accent === item.id 
                    ? 'ring-2 ring-offset-2 ring-white ' + (resolvedMode === 'dark' ? 'ring-offset-obsidian-900' : 'ring-offset-white')
                    : ''
                }`} />
                <span className={`text-xs font-medium ${
                  themeSettings.accent === item.id 
                    ? resolvedMode === 'dark' ? 'text-obsidian-100' : 'text-gray-900'
                    : resolvedMode === 'dark' ? 'text-obsidian-400' : 'text-gray-500'
                }`}>
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h4 className={`text-sm font-semibold uppercase tracking-wide ${resolvedMode === 'dark' ? 'text-obsidian-300' : 'text-gray-600'}`}>Display Options</h4>
          
          <label className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-colors ${
            resolvedMode === 'dark' ? 'bg-obsidian-800/50 hover:bg-obsidian-800' : 'bg-gray-50 hover:bg-gray-100'
          }`}>
            <div>
              <p className={`font-medium ${resolvedMode === 'dark' ? 'text-obsidian-100' : 'text-gray-900'}`}>Compact Mode</p>
              <p className={`text-sm ${resolvedMode === 'dark' ? 'text-obsidian-400' : 'text-gray-500'}`}>Reduce spacing for more data density</p>
            </div>
            <div className="relative">
              <input 
                type="checkbox" 
                checked={themeSettings.compactMode}
                onChange={(e) => updateTheme({ compactMode: e.target.checked })}
                className="sr-only peer" 
              />
              <div 
                className="w-11 h-6 rounded-full peer transition-colors"
                style={{ backgroundColor: themeSettings.compactMode ? `rgb(var(--accent-primary))` : resolvedMode === 'dark' ? '#475569' : '#d1d5db' }}
              />
              <div className={`absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${themeSettings.compactMode ? 'translate-x-5' : ''}`} />
            </div>
          </label>
          
          <label className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-colors ${
            resolvedMode === 'dark' ? 'bg-obsidian-800/50 hover:bg-obsidian-800' : 'bg-gray-50 hover:bg-gray-100'
          }`}>
            <div>
              <p className={`font-medium ${resolvedMode === 'dark' ? 'text-obsidian-100' : 'text-gray-900'}`}>Animations</p>
              <p className={`text-sm ${resolvedMode === 'dark' ? 'text-obsidian-400' : 'text-gray-500'}`}>Enable motion and transitions</p>
            </div>
            <div className="relative">
              <input 
                type="checkbox" 
                checked={themeSettings.animations}
                onChange={(e) => updateTheme({ animations: e.target.checked })}
                className="sr-only peer" 
              />
              <div 
                className="w-11 h-6 rounded-full peer transition-colors"
                style={{ backgroundColor: themeSettings.animations ? `rgb(var(--accent-primary))` : resolvedMode === 'dark' ? '#475569' : '#d1d5db' }}
              />
              <div className={`absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${themeSettings.animations ? 'translate-x-5' : ''}`} />
            </div>
          </label>
        </div>

        {/* Preview */}
        <div className="space-y-4">
          <h4 className={`text-sm font-semibold uppercase tracking-wide ${resolvedMode === 'dark' ? 'text-obsidian-300' : 'text-gray-600'}`}>Preview</h4>
          <div className={`p-4 rounded-xl border ${resolvedMode === 'dark' ? 'bg-obsidian-800/50 border-obsidian-700' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center gap-4 mb-4">
              <button className="btn-primary px-4 py-2 text-sm">Primary Button</button>
              <button className="btn-secondary px-4 py-2 text-sm">Secondary</button>
            </div>
            <div className="flex gap-2 flex-wrap">
              <span className="status-approved">Approved</span>
              <span className="status-pending">Pending</span>
              <span className="status-flagged">Flagged</span>
              <span className="status-declined">Declined</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'fraud': return renderFraudSettings();
      case 'notifications': return renderNotificationSettings();
      case 'cards': return renderCardSettings();
      case 'company': return renderCompanySettings();
      case 'security': return renderSecuritySettings();
      case 'appearance': return renderAppearanceSettings();
      default: return null;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Settings</h1>
          <p className="text-obsidian-400 mt-1">
            Configure your CorpSpend platform preferences
          </p>
        </div>
        <motion.button
          onClick={handleSave}
          whileTap={{ scale: 0.98 }}
          className={`btn-primary flex items-center gap-2 ${saved ? 'bg-vault-600' : ''}`}
        >
          {saved ? (
            <>
              <CheckCircle className="w-5 h-5" />
              Saved!
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Save Changes
            </>
          )}
        </motion.button>
      </div>

      <div className="flex gap-8">
        {/* Sidebar Navigation */}
        <div className="w-64 flex-shrink-0">
          <nav className="space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                  activeSection === section.id
                    ? 'bg-vault-500/10 text-vault-400 border-l-2 border-vault-500'
                    : 'text-obsidian-300 hover:bg-obsidian-800 hover:text-obsidian-100'
                }`}
              >
                {section.icon}
                <div>
                  <p className="font-medium">{section.title}</p>
                  <p className="text-xs text-obsidian-500">{section.description}</p>
                </div>
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <motion.div
          key={activeSection}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          className="flex-1 card-glass p-8"
        >
          <h2 className="text-xl font-semibold text-white mb-6">
            {sections.find(s => s.id === activeSection)?.title}
          </h2>
          {renderContent()}
        </motion.div>
      </div>
    </div>
  );
}

