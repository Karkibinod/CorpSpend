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
  User,
  CheckCircle
} from 'lucide-react';
import { api } from '../api/client';

export default function Signup() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      console.log('📝 Attempting signup for:', formData.email);
      await api.signup(formData.name, formData.email, formData.password);
      console.log('✅ Signup successful');
      setSuccess(true);
    } catch (err) {
      console.error('❌ Signup failed:', err);
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-obsidian-950 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md card-glass p-8 text-center space-y-6"
        >
          <div className="w-16 h-16 mx-auto rounded-full bg-vault-500/20 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-vault-400" />
          </div>
          <h2 className="text-2xl font-display font-bold text-white">
            Account Created!
          </h2>
          <p className="text-obsidian-400">
            Your account has been created successfully. You can now sign in with your credentials.
          </p>
          <Link
            to="/login"
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            Go to Sign In
            <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </div>
    );
  }

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
          <Link to="/login" className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-vault-500 to-vault-600 flex items-center justify-center shadow-lg shadow-vault-500/30">
              <Wallet className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-display font-bold text-white">
              CorpSpend
            </span>
          </Link>
        </div>

        <div className="space-y-8">
          <h1 className="text-5xl font-display font-bold text-white leading-tight">
            Join the Future of<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-vault-400 to-emerald-400">
              Corporate Finance
            </span>
          </h1>
          <p className="text-xl text-obsidian-300 max-w-lg">
            Create your account and start managing corporate spending with enterprise-grade 
            security and real-time fraud detection.
          </p>
        </div>

        <p className="text-sm text-obsidian-500">
          © 2024 CorpSpend. All rights reserved.
        </p>
      </motion.div>

      {/* Right Panel - Signup Form */}
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

          <div className="card-glass p-8 space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-display font-bold text-white">
                Create Account
              </h2>
              <p className="text-obsidian-400 mt-2">
                Get started with your free account
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="label">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-obsidian-400 pointer-events-none z-10" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="John Doe"
                    className="w-full px-4 py-3 pl-12 bg-obsidian-800/50 border border-obsidian-600 rounded-xl text-obsidian-100 placeholder-obsidian-400 focus:outline-none focus:ring-2 focus:ring-vault-500/30 focus:border-vault-500 transition-all duration-200"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-obsidian-400 pointer-events-none z-10" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
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
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Create a password"
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

              <div>
                <label className="label">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-obsidian-400 pointer-events-none z-10" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm your password"
                    className="w-full px-4 py-3 pl-12 bg-obsidian-800/50 border border-obsidian-600 rounded-xl text-obsidian-100 placeholder-obsidian-400 focus:outline-none focus:ring-2 focus:ring-vault-500/30 focus:border-vault-500 transition-all duration-200"
                    required
                  />
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
                    Create Account
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-sm text-obsidian-400">
              Already have an account?{' '}
              <Link to="/login" className="text-vault-400 hover:text-vault-300 font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

