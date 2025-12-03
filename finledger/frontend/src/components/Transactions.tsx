import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Search, 
  Filter,
  ArrowUpRight,
  CheckCircle,
  AlertTriangle,
  Clock,
  X,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Shield
} from 'lucide-react';
import { api } from '../api/client';
import type { Card, Transaction, CreateTransactionRequest } from '../types';
import { format } from 'date-fns';

function formatCurrency(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(num);
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { class: string; icon: React.ReactNode }> = {
    approved: { 
      class: 'status-approved', 
      icon: <CheckCircle className="w-3 h-3" /> 
    },
    pending: { 
      class: 'status-pending', 
      icon: <Clock className="w-3 h-3" /> 
    },
    declined: { 
      class: 'status-declined', 
      icon: <X className="w-3 h-3" /> 
    },
    flagged: { 
      class: 'status-flagged', 
      icon: <AlertTriangle className="w-3 h-3" /> 
    },
    verified: { 
      class: 'status-verified', 
      icon: <CheckCircle className="w-3 h-3" /> 
    },
  };

  const { class: className, icon } = config[status] || config.pending;

  return (
    <span className={`${className} flex items-center gap-1`}>
      {icon}
      {status}
    </span>
  );
}

function CreateTransactionModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  cards
}: { 
  isOpen: boolean; 
  onClose: () => void;
  onSuccess: (transaction: Transaction) => void;
  cards: Card[];
}) {
  const [formData, setFormData] = useState<CreateTransactionRequest>({
    card_id: '',
    amount: 0,
    merchant_name: '',
    merchant_category: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const transaction = await api.createTransaction(formData);
      onSuccess(transaction);
      onClose();
      setFormData({
        card_id: '',
        amount: 0,
        merchant_name: '',
        merchant_category: '',
        description: '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg card-glass p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-display font-bold text-white">New Transaction</h2>
                <p className="text-sm text-obsidian-400 mt-1">Process a new payment</p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-obsidian-800 flex items-center justify-center text-obsidian-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Fraud Warning */}
            <div className="mb-6 p-4 rounded-xl bg-vault-500/10 border border-vault-500/20">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-vault-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-vault-300">Fraud Protection Active</p>
                  <p className="text-xs text-vault-500 mt-1">
                    Transactions over $5,000 or to blacklisted merchants will be blocked.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Select Card</label>
                <select
                  value={formData.card_id}
                  onChange={(e) => setFormData({ ...formData, card_id: e.target.value })}
                  className="input-field"
                  required
                >
                  <option value="">Choose a card...</option>
                  {cards.map((card) => (
                    <option key={card.id} value={card.id}>
                      {card.card_number} - {card.cardholder_name} ({formatCurrency(card.available_balance)} available)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Merchant Name</label>
                <input
                  type="text"
                  value={formData.merchant_name}
                  onChange={(e) => setFormData({ ...formData, merchant_name: e.target.value })}
                  placeholder="Office Supplies Inc"
                  className="input-field"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Amount (USD)</label>
                  <input
                    type="number"
                    value={formData.amount || ''}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    placeholder="149.99"
                    step="0.01"
                    min="0.01"
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="label">Category</label>
                  <select
                    value={formData.merchant_category}
                    onChange={(e) => setFormData({ ...formData, merchant_category: e.target.value })}
                    className="input-field"
                  >
                    <option value="">Select category...</option>
                    <option value="OFFICE">Office Supplies</option>
                    <option value="TRAVEL">Travel</option>
                    <option value="SOFTWARE">Software</option>
                    <option value="MEALS">Meals & Entertainment</option>
                    <option value="MARKETING">Marketing</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Description (Optional)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Monthly supplies order..."
                  rows={2}
                  className="input-field resize-none"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !formData.card_id}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <ArrowUpRight className="w-4 h-4" />
                      Process Payment
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, [page, statusFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [transactionsRes, cardsRes] = await Promise.all([
        api.getTransactions(page, 10, { status: statusFilter || undefined }),
        api.getCards(1, 100),
      ]);

      setTransactions(transactionsRes.transactions);
      setCards(cardsRes.cards);
      setTotalPages(Math.ceil(transactionsRes.total / 10));
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTransactionCreated = (transaction: Transaction) => {
    setTransactions([transaction, ...transactions.slice(0, 9)]);
  };

  const filteredTransactions = transactions.filter((t) =>
    t.merchant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Transactions</h1>
          <p className="text-obsidian-400 mt-1">
            View and manage all corporate spending transactions
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          disabled={cards.length === 0}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Transaction
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-obsidian-400 pointer-events-none z-10" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search transactions..."
            className="w-full px-4 py-3 pl-12 bg-obsidian-800/50 border border-obsidian-600 rounded-xl text-obsidian-100 placeholder-obsidian-400 focus:outline-none focus:ring-2 focus:ring-vault-500/30 focus:border-vault-500 transition-all duration-200"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-obsidian-400 pointer-events-none z-10" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="w-full px-4 py-3 pl-12 pr-10 bg-obsidian-800/50 border border-obsidian-600 rounded-xl text-obsidian-100 focus:outline-none focus:ring-2 focus:ring-vault-500/30 focus:border-vault-500 transition-all duration-200 appearance-none cursor-pointer min-w-[160px]"
          >
            <option value="">All Status</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="declined">Declined</option>
            <option value="flagged">Flagged</option>
            <option value="verified">Verified</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-glass overflow-hidden"
      >
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-vault-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-obsidian-800 flex items-center justify-center">
              <ArrowUpRight className="w-8 h-8 text-obsidian-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No transactions found</h3>
            <p className="text-obsidian-400 mb-6">
              {cards.length === 0 
                ? 'Create a card first to start processing transactions.'
                : 'Start by creating your first transaction.'}
            </p>
            {cards.length > 0 && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="btn-primary inline-flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                New Transaction
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-obsidian-800/50">
                  <tr>
                    <th className="table-header">Transaction</th>
                    <th className="table-header">Amount</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Fraud Score</th>
                    <th className="table-header">Receipt</th>
                    <th className="table-header">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-obsidian-700/50">
                  {filteredTransactions.map((transaction, index) => (
                    <motion.tr
                      key={transaction.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-obsidian-800/30 transition-colors"
                    >
                      <td className="table-cell">
                        <div>
                          <p className="font-medium text-obsidian-100">{transaction.merchant_name}</p>
                          <p className="text-xs text-obsidian-400">
                            {transaction.merchant_category || 'Uncategorized'}
                            {transaction.description && ` • ${transaction.description}`}
                          </p>
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
                        {transaction.fraud_score ? (
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-obsidian-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  parseFloat(transaction.fraud_score) > 0.7
                                    ? 'bg-red-500'
                                    : parseFloat(transaction.fraud_score) > 0.3
                                    ? 'bg-gold-500'
                                    : 'bg-vault-500'
                                }`}
                                style={{ width: `${parseFloat(transaction.fraud_score) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-obsidian-400 font-mono">
                              {(parseFloat(transaction.fraud_score) * 100).toFixed(0)}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-obsidian-500">—</span>
                        )}
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
                        {format(new Date(transaction.created_at), 'MMM d, yyyy')}
                        <br />
                        <span className="text-xs">{format(new Date(transaction.created_at), 'HH:mm:ss')}</span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-obsidian-700/50">
                <p className="text-sm text-obsidian-400">
                  Page {page} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="w-9 h-9 rounded-lg bg-obsidian-800 flex items-center justify-center text-obsidian-400 hover:text-white hover:bg-obsidian-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page === totalPages}
                    className="w-9 h-9 rounded-lg bg-obsidian-800 flex items-center justify-center text-obsidian-400 hover:text-white hover:bg-obsidian-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>

      {/* Create Transaction Modal */}
      <CreateTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleTransactionCreated}
        cards={cards.filter(c => c.status === 'active')}
      />
    </div>
  );
}

