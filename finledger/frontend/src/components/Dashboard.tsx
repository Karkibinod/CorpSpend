import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Activity
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { api } from '../api/client';
import type { Card, Transaction } from '../types';
import { format } from 'date-fns';

// Mock chart data
const spendingData = [
  { date: 'Mon', amount: 2400 },
  { date: 'Tue', amount: 1398 },
  { date: 'Wed', amount: 3800 },
  { date: 'Thu', amount: 3908 },
  { date: 'Fri', amount: 4800 },
  { date: 'Sat', amount: 1800 },
  { date: 'Sun', amount: 2400 },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

function formatCurrency(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(num);
}

function StatusBadge({ status }: { status: string }) {
  const statusClasses: Record<string, string> = {
    approved: 'status-approved',
    pending: 'status-pending',
    declined: 'status-declined',
    flagged: 'status-flagged',
    verified: 'status-verified',
    active: 'status-active',
    frozen: 'status-frozen',
    cancelled: 'status-cancelled',
  };

  return (
    <span className={statusClasses[status] || 'status-pending'}>
      {status}
    </span>
  );
}

export default function Dashboard() {
  const [cards, setCards] = useState<Card[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSpending: 0,
    totalCards: 0,
    activeCards: 0,
    totalTransactions: 0,
    flaggedCount: 0,
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const [cardsRes, transactionsRes] = await Promise.all([
          api.getCards(1, 100),
          api.getTransactions(1, 10),
        ]);

        setCards(cardsRes.cards);
        setTransactions(transactionsRes.transactions);

        // Calculate stats
        const totalSpending = cardsRes.cards.reduce(
          (sum, card) => sum + parseFloat(card.current_balance),
          0
        );
        const activeCards = cardsRes.cards.filter(c => c.status === 'active').length;
        const flaggedCount = transactionsRes.transactions.filter(
          t => t.status === 'flagged'
        ).length;

        setStats({
          totalSpending,
          totalCards: cardsRes.total,
          activeCards,
          totalTransactions: transactionsRes.total,
          flaggedCount,
        });
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-vault-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-display font-bold text-white">Dashboard</h1>
        <p className="text-obsidian-400 mt-1">
          Real-time overview of your corporate spending
        </p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Spending */}
        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-obsidian-400 font-medium">Total Spending</p>
              <p className="text-3xl font-mono font-bold text-white mt-2">
                {formatCurrency(stats.totalSpending)}
              </p>
              <div className="flex items-center gap-1 mt-2 text-vault-400 text-sm">
                <ArrowUpRight className="w-4 h-4" />
                <span>12.5% from last month</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-vault-500/20 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-vault-400" />
            </div>
          </div>
        </div>

        {/* Active Cards */}
        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-obsidian-400 font-medium">Active Cards</p>
              <p className="text-3xl font-mono font-bold text-white mt-2">
                {stats.activeCards}
                <span className="text-lg text-obsidian-500">/{stats.totalCards}</span>
              </p>
              <div className="flex items-center gap-1 mt-2 text-obsidian-400 text-sm">
                <Activity className="w-4 h-4" />
                <span>Cards in circulation</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>

        {/* Transactions */}
        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-obsidian-400 font-medium">Transactions</p>
              <p className="text-3xl font-mono font-bold text-white mt-2">
                {stats.totalTransactions}
              </p>
              <div className="flex items-center gap-1 mt-2 text-vault-400 text-sm">
                <TrendingUp className="w-4 h-4" />
                <span>This period</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <ArrowUpRight className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </div>

        {/* Flagged */}
        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-obsidian-400 font-medium">Flagged</p>
              <p className="text-3xl font-mono font-bold text-white mt-2">
                {stats.flaggedCount}
              </p>
              <div className="flex items-center gap-1 mt-2 text-orange-400 text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>Requires review</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-orange-400" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Charts and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Spending Chart */}
        <motion.div variants={itemVariants} className="lg:col-span-2 card-glass p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Weekly Spending Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={spendingData}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="date" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '12px',
                    padding: '12px',
                  }}
                  labelStyle={{ color: '#94a3b8' }}
                  formatter={(value: number) => [formatCurrency(value), 'Amount']}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#22c55e"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorAmount)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Quick Stats */}
        <motion.div variants={itemVariants} className="card-glass p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Transaction Status</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-obsidian-800/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-vault-500/20 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-vault-400" />
                </div>
                <span className="text-obsidian-200">Approved</span>
              </div>
              <span className="font-mono font-semibold text-vault-400">
                {transactions.filter(t => t.status === 'approved').length}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-obsidian-800/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gold-500/20 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-gold-400" />
                </div>
                <span className="text-obsidian-200">Pending</span>
              </div>
              <span className="font-mono font-semibold text-gold-400">
                {transactions.filter(t => t.status === 'pending').length}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-obsidian-800/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-blue-400" />
                </div>
                <span className="text-obsidian-200">Verified</span>
              </div>
              <span className="font-mono font-semibold text-blue-400">
                {transactions.filter(t => t.status === 'verified').length}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-obsidian-800/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <ArrowDownRight className="w-4 h-4 text-red-400" />
                </div>
                <span className="text-obsidian-200">Declined</span>
              </div>
              <span className="font-mono font-semibold text-red-400">
                {transactions.filter(t => t.status === 'declined').length}
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Recent Transactions */}
      <motion.div variants={itemVariants} className="card-glass overflow-hidden">
        <div className="p-6 border-b border-obsidian-700/50">
          <h3 className="text-lg font-semibold text-white">Recent Transactions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-obsidian-800/50">
              <tr>
                <th className="table-header">Merchant</th>
                <th className="table-header">Amount</th>
                <th className="table-header">Status</th>
                <th className="table-header">Receipt</th>
                <th className="table-header">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-obsidian-700/50">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="table-cell text-center text-obsidian-400 py-12">
                    No transactions yet. Create your first transaction to get started.
                  </td>
                </tr>
              ) : (
                transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-obsidian-800/30 transition-colors">
                    <td className="table-cell">
                      <div>
                        <p className="font-medium text-obsidian-100">{transaction.merchant_name}</p>
                        <p className="text-xs text-obsidian-400">{transaction.merchant_category || 'Uncategorized'}</p>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className="font-mono font-semibold text-white">
                        {formatCurrency(transaction.amount)}
                      </span>
                    </td>
                    <td className="table-cell">
                      <StatusBadge status={transaction.status} />
                    </td>
                    <td className="table-cell">
                      {transaction.receipt_verified ? (
                        <span className="flex items-center gap-1 text-vault-400">
                          <CheckCircle className="w-4 h-4" />
                          Verified
                        </span>
                      ) : (
                        <span className="text-obsidian-400">Pending</span>
                      )}
                    </td>
                    <td className="table-cell text-obsidian-400">
                      {format(new Date(transaction.created_at), 'MMM d, yyyy HH:mm')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}

