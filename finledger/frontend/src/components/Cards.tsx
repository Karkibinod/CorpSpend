import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  CreditCard, 
  Snowflake, 
  Ban, 
  X,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { api } from '../api/client';
import type { Card } from '../types';

function formatCurrency(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(num);
}

function generateCardNumber(): string {
  const prefix = '4'; // Visa-like
  let number = prefix;
  for (let i = 0; i < 15; i++) {
    number += Math.floor(Math.random() * 10);
  }
  return number;
}

const cardGradients = [
  'from-vault-600 via-vault-500 to-emerald-400',
  'from-blue-600 via-blue-500 to-cyan-400',
  'from-purple-600 via-purple-500 to-pink-400',
  'from-orange-600 via-orange-500 to-amber-400',
  'from-obsidian-700 via-obsidian-600 to-obsidian-500',
];

function CorporateCard({ card, index }: { card: Card; index: number }) {
  const gradient = cardGradients[index % cardGradients.length];
  const usagePercentage = (parseFloat(card.current_balance) / parseFloat(card.spending_limit)) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="relative group"
    >
      {/* Card */}
      <div className={`relative h-52 rounded-2xl bg-gradient-to-br ${gradient} p-6 overflow-hidden shadow-xl shadow-black/20`}>
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full translate-y-24 -translate-x-24" />
        <div className="card-shine absolute inset-0" />
        
        {/* Card content */}
        <div className="relative h-full flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/70 text-sm">Corporate Card</p>
              <p className="text-white font-semibold mt-1">{card.cardholder_name}</p>
            </div>
            <div className="flex items-center gap-2">
              {card.status === 'frozen' && (
                <Snowflake className="w-5 h-5 text-white/80" />
              )}
              {card.status === 'cancelled' && (
                <Ban className="w-5 h-5 text-white/80" />
              )}
              <CreditCard className="w-8 h-8 text-white/80" />
            </div>
          </div>

          <div>
            <p className="font-mono text-xl text-white tracking-widest">
              {card.card_number}
            </p>
          </div>

          <div className="flex items-end justify-between">
            <div>
              <p className="text-white/60 text-xs uppercase tracking-wide">Balance</p>
              <p className="font-mono text-lg text-white font-semibold">
                {formatCurrency(card.current_balance)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-white/60 text-xs uppercase tracking-wide">Limit</p>
              <p className="font-mono text-lg text-white font-semibold">
                {formatCurrency(card.spending_limit)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Usage bar */}
      <div className="mt-4 px-2">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-obsidian-400">Usage</span>
          <span className="font-mono text-obsidian-200">{usagePercentage.toFixed(1)}%</span>
        </div>
        <div className="h-2 bg-obsidian-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${usagePercentage}%` }}
            transition={{ duration: 1, delay: index * 0.1 }}
            className={`h-full rounded-full ${
              usagePercentage > 80 
                ? 'bg-gradient-to-r from-red-500 to-red-400' 
                : usagePercentage > 50 
                  ? 'bg-gradient-to-r from-gold-500 to-gold-400'
                  : 'bg-gradient-to-r from-vault-500 to-vault-400'
            }`}
          />
        </div>
        <p className="text-xs text-obsidian-500 mt-2">
          {formatCurrency(card.available_balance)} available
        </p>
      </div>
    </motion.div>
  );
}

function CreateCardModal({ 
  isOpen, 
  onClose, 
  onSuccess 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  onSuccess: (card: Card) => void;
}) {
  const [formData, setFormData] = useState({
    cardholder_name: '',
    spending_limit: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const card = await api.createCard({
        card_number: generateCardNumber(),
        cardholder_name: formData.cardholder_name,
        spending_limit: parseFloat(formData.spending_limit),
      });
      onSuccess(card);
      onClose();
      setFormData({ cardholder_name: '', spending_limit: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create card');
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
            className="w-full max-w-md card-glass p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-display font-bold text-white">Create New Card</h2>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-obsidian-800 flex items-center justify-center text-obsidian-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Cardholder Name</label>
                <input
                  type="text"
                  value={formData.cardholder_name}
                  onChange={(e) => setFormData({ ...formData, cardholder_name: e.target.value })}
                  placeholder="John Doe"
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="label">Spending Limit (USD)</label>
                <input
                  type="number"
                  value={formData.spending_limit}
                  onChange={(e) => setFormData({ ...formData, spending_limit: e.target.value })}
                  placeholder="10000.00"
                  step="0.01"
                  min="100"
                  max="1000000"
                  className="input-field"
                  required
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
                  disabled={loading}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Create Card
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

export default function Cards() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      const response = await api.getCards(1, 50);
      setCards(response.cards);
    } catch (error) {
      console.error('Failed to fetch cards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCardCreated = (card: Card) => {
    setCards([card, ...cards]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-vault-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Corporate Cards</h1>
          <p className="text-obsidian-400 mt-1">
            Manage and monitor your corporate spending cards
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Issue New Card
        </button>
      </div>

      {/* Cards Grid */}
      {cards.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-glass p-12 text-center"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-obsidian-800 flex items-center justify-center">
            <CreditCard className="w-8 h-8 text-obsidian-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No cards yet</h3>
          <p className="text-obsidian-400 mb-6">
            Issue your first corporate card to start tracking spending.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Issue New Card
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {cards.map((card, index) => (
            <CorporateCard key={card.id} card={card} index={index} />
          ))}
        </div>
      )}

      {/* Create Card Modal */}
      <CreateCardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleCardCreated}
      />
    </div>
  );
}

