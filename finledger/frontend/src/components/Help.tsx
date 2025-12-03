import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Book, 
  MessageCircle, 
  Mail, 
  Phone,
  ChevronDown,
  ExternalLink,
  Shield,
  CreditCard,
  Receipt,
  AlertTriangle,
  Zap,
  Lock
} from 'lucide-react';

interface FAQ {
  question: string;
  answer: string;
  category: string;
}

const faqs: FAQ[] = [
  {
    category: 'Fraud Protection',
    question: 'What triggers the fraud detection system?',
    answer: 'Our fraud engine blocks transactions that exceed $5,000 or involve merchants on the blacklist. It also flags transactions with high velocity (too many in a short period) and those with unusual patterns. You can configure these thresholds in Settings → Fraud Protection.',
  },
  {
    category: 'Fraud Protection',
    question: 'How do I add a merchant to the blacklist?',
    answer: 'Navigate to Settings → Fraud Protection → Merchant Blacklist. Enter the merchant name (one per line) in the text area. Merchant matching is case-insensitive and supports partial matching.',
  },
  {
    category: 'Cards',
    question: 'How do I issue a new corporate card?',
    answer: 'Go to the Cards page and click "Issue New Card". Enter the cardholder name and spending limit. The card number is automatically generated. New cards are active immediately.',
  },
  {
    category: 'Cards',
    question: 'What happens when a card reaches its spending limit?',
    answer: 'Transactions that would exceed the spending limit are automatically declined with an "Insufficient Funds" error. The cardholder and administrator receive notifications. You can increase the limit in the card settings.',
  },
  {
    category: 'Transactions',
    question: 'How does the row-level locking prevent race conditions?',
    answer: 'When processing a transaction, we use PostgreSQL\'s SELECT FOR UPDATE to acquire an exclusive lock on the card row. This ensures that only one transaction can modify the balance at a time, preventing double-spending even with simultaneous requests.',
  },
  {
    category: 'Transactions',
    question: 'What do the different transaction statuses mean?',
    answer: 'Pending: Processing in progress. Approved: Successfully processed. Declined: Rejected (insufficient funds or fraud). Flagged: Approved but marked for review. Verified: Approved with receipt verification complete.',
  },
  {
    category: 'Receipts',
    question: 'How does receipt OCR matching work?',
    answer: 'Upload a receipt image and our OCR engine extracts the merchant name, amount, and date. We then search for matching transactions based on these values. Matches with 80%+ confidence are automatically verified; lower confidence matches are flagged for manual review.',
  },
  {
    category: 'Receipts',
    question: 'What image formats are supported for receipts?',
    answer: 'We support JPG, PNG, GIF, and PDF formats. Maximum file size is 16MB. For best OCR results, ensure the receipt is well-lit, flat, and the text is clearly visible.',
  },
];

const categories = [...new Set(faqs.map(f => f.category))];

function FAQItem({ faq }: { faq: FAQ }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-obsidian-700/50 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-4 text-left"
      >
        <span className="font-medium text-obsidian-100 pr-4">{faq.question}</span>
        <ChevronDown className={`w-5 h-5 text-obsidian-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="pb-4 text-obsidian-400 leading-relaxed">{faq.answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Help() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filteredFaqs = activeCategory
    ? faqs.filter(f => f.category === activeCategory)
    : faqs;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold text-white">Help & Support</h1>
        <p className="text-obsidian-400 mt-1">
          Find answers to common questions and get support
        </p>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.a
          href="#"
          whileHover={{ scale: 1.02 }}
          className="card-glass-hover p-6 flex items-start gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
            <Book className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white mb-1">Documentation</h3>
            <p className="text-sm text-obsidian-400">Complete guides and API reference</p>
            <span className="inline-flex items-center gap-1 mt-2 text-sm text-blue-400">
              Read docs <ExternalLink className="w-3 h-3" />
            </span>
          </div>
        </motion.a>

        <motion.a
          href="#"
          whileHover={{ scale: 1.02 }}
          className="card-glass-hover p-6 flex items-start gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
            <MessageCircle className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white mb-1">Live Chat</h3>
            <p className="text-sm text-obsidian-400">Chat with our support team</p>
            <span className="inline-flex items-center gap-1 mt-2 text-sm text-purple-400">
              Start chat <ExternalLink className="w-3 h-3" />
            </span>
          </div>
        </motion.a>

        <motion.a
          href="mailto:support@corpspend.io"
          whileHover={{ scale: 1.02 }}
          className="card-glass-hover p-6 flex items-start gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-vault-500/20 flex items-center justify-center flex-shrink-0">
            <Mail className="w-6 h-6 text-vault-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white mb-1">Email Support</h3>
            <p className="text-sm text-obsidian-400">support@corpspend.io</p>
            <span className="inline-flex items-center gap-1 mt-2 text-sm text-vault-400">
              Send email <ExternalLink className="w-3 h-3" />
            </span>
          </div>
        </motion.a>
      </div>

      {/* Feature Highlights */}
      <div className="card-glass p-6">
        <h2 className="text-xl font-semibold text-white mb-6">Platform Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: Shield, title: 'Fraud Protection', desc: 'Real-time transaction monitoring with customizable rules', color: 'text-vault-400 bg-vault-500/20' },
            { icon: Lock, title: 'Row-Level Locking', desc: 'PostgreSQL SELECT FOR UPDATE prevents race conditions', color: 'text-blue-400 bg-blue-500/20' },
            { icon: CreditCard, title: 'Card Management', desc: 'Issue and manage corporate cards with spending limits', color: 'text-purple-400 bg-purple-500/20' },
            { icon: Receipt, title: 'Receipt OCR', desc: 'Automatic receipt scanning and transaction matching', color: 'text-orange-400 bg-orange-500/20' },
            { icon: Zap, title: 'Async Processing', desc: 'Celery workers handle heavy operations in background', color: 'text-gold-400 bg-gold-500/20' },
            { icon: AlertTriangle, title: 'Audit Trail', desc: 'Complete transaction history with fraud scoring', color: 'text-red-400 bg-red-500/20' },
          ].map((feature, i) => (
            <div key={i} className="p-4 rounded-xl bg-obsidian-800/50 border border-obsidian-700/50">
              <div className={`w-10 h-10 rounded-lg ${feature.color.split(' ')[1]} flex items-center justify-center mb-3`}>
                <feature.icon className={`w-5 h-5 ${feature.color.split(' ')[0]}`} />
              </div>
              <h3 className="font-medium text-white mb-1">{feature.title}</h3>
              <p className="text-sm text-obsidian-400">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ Section */}
      <div className="card-glass p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Frequently Asked Questions</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                activeCategory === null
                  ? 'bg-vault-500/20 text-vault-400'
                  : 'text-obsidian-400 hover:text-obsidian-200'
              }`}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  activeCategory === cat
                    ? 'bg-vault-500/20 text-vault-400'
                    : 'text-obsidian-400 hover:text-obsidian-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-obsidian-700/50">
          {filteredFaqs.map((faq, i) => (
            <FAQItem key={i} faq={faq} />
          ))}
        </div>
      </div>

      {/* Contact Section */}
      <div className="card-glass p-6">
        <h2 className="text-xl font-semibold text-white mb-6">Still Need Help?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center gap-4 p-4 rounded-xl bg-obsidian-800/50">
            <div className="w-12 h-12 rounded-xl bg-obsidian-700 flex items-center justify-center">
              <Phone className="w-6 h-6 text-obsidian-300" />
            </div>
            <div>
              <p className="text-sm text-obsidian-400">Call us</p>
              <p className="font-semibold text-white">+1 (800) FIN-LEDG</p>
              <p className="text-xs text-obsidian-500">Mon-Fri 9am-6pm ET</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 rounded-xl bg-obsidian-800/50">
            <div className="w-12 h-12 rounded-xl bg-obsidian-700 flex items-center justify-center">
              <Mail className="w-6 h-6 text-obsidian-300" />
            </div>
            <div>
              <p className="text-sm text-obsidian-400">Enterprise Support</p>
              <p className="font-semibold text-white">enterprise@corpspend.io</p>
              <p className="text-xs text-obsidian-500">24/7 priority support</p>
            </div>
          </div>
        </div>
      </div>

      {/* Version Info */}
      <div className="text-center text-sm text-obsidian-500">
        <p>CorpSpend v1.0.0 • The Autonomous Finance Platform</p>
        <p className="mt-1">Built with Flask, PostgreSQL, Celery, and React</p>
      </div>
    </div>
  );
}

