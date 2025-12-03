import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Wallet, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertCircle,
  ArrowRight,
  Shield
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  return (
    <div className="min-h-screen bg-obsidian-950 flex">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-vault-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      {/* Left Panel - Branding */}
      <motion.div 
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="hidden lg:flex lg:w-1/2 relative p-12 flex-col justify-between"
      >
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-vault-500 to-vault-600 flex items-center justify-center shadow-lg shadow-vault-500/30">
              <Wallet className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-display font-bold text-white">
              CorpSpend
            </span>
          </div>
        </div>

        <div className="space-y-8">
          <h1 className="text-5xl font-display font-bold text-white leading-tight">
            The Autonomous<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-vault-400 to-emerald-400">
              Finance Platform
            </span>
          </h1>
          <p className="text-xl text-obsidian-300 max-w-lg">
            Enterprise-grade corporate spend management with real-time fraud detection 
            and ACID-compliant transaction processing.
          </p>

          <div className="flex gap-8">
            {[
              { label: 'Fraud Detection', icon: Shield },
              { label: 'Real-time Processing', icon: ArrowRight },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="flex items-center gap-2 text-obsidian-300"
              >
                <item.icon className="w-5 h-5 text-vault-400" />
                <span className="text-sm font-medium">{item.label}</span>
              </motion.div>
            ))}
          </div>
        </div>

        <p className="text-sm text-obsidian-500">
          © 2024 CorpSpend. All rights reserved.
        </p>
      </motion.div>

      {/* Right Panel - Login Form */}
      <motion.div 
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full lg:w-1/2 flex items-center justify-center p-8"
      >
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-12 justify-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-vault-500 to-vault-600 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-display font-bold text-white">CorpSpend</span>
          </div>

          <div className="card-glass p-8 space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-display font-bold text-white">
                Welcome Back
              </h2>
              <p className="text-obsidian-400 mt-2">
                Sign in to access your dashboard
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="label">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-obsidian-400 pointer-events-none z-10" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full px-4 py-3 pl-12 bg-obsidian-800/50 border border-obsidian-600 rounded-xl text-obsidian-100 placeholder-obsidian-400 focus:outline-none focus:ring-2 focus:ring-vault-500/30 focus:border-vault-500 transition-all duration-200"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-obsidian-400 pointer-events-none z-10" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full px-4 py-3 pl-12 pr-12 bg-obsidian-800/50 border border-obsidian-600 rounded-xl text-obsidian-100 placeholder-obsidian-400 focus:outline-none focus:ring-2 focus:ring-vault-500/30 focus:border-vault-500 transition-all duration-200"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-obsidian-400 hover:text-obsidian-200 transition-colors z-10"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </motion.div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-sm text-obsidian-400">
              Don't have an account?{' '}
              <Link to="/signup" className="text-vault-400 hover:text-vault-300 font-medium">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
