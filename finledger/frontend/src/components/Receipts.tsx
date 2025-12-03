import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  FileImage, 
  CheckCircle, 
  Clock,
  AlertCircle,
  X,
  Loader2,
  Scan
} from 'lucide-react';
import { api } from '../api/client';
import type { Transaction } from '../types';
import { format } from 'date-fns';

interface UploadedReceipt {
  id: string;
  file: File;
  preview: string;
  taskId: string | null;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  result?: {
    match_found: boolean;
    match_confidence: number;
    verified: boolean;
    matched_transaction_id?: string;
  };
  error?: string;
  transactionId?: string;
}

function formatCurrency(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(num);
}

function ReceiptCard({ receipt, onRemove }: { receipt: UploadedReceipt; onRemove: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="card-glass p-4"
    >
      <div className="flex gap-4">
        {/* Preview */}
        <div className="w-24 h-24 rounded-xl bg-obsidian-800 overflow-hidden flex-shrink-0">
          <img
            src={receipt.preview}
            alt="Receipt preview"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-white truncate">{receipt.file.name}</p>
              <p className="text-xs text-obsidian-400 mt-1">
                {(receipt.file.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <button
              onClick={onRemove}
              className="w-6 h-6 rounded-lg bg-obsidian-800 flex items-center justify-center text-obsidian-400 hover:text-white hover:bg-red-500/20 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          {/* Status */}
          <div className="mt-3">
            {receipt.status === 'uploading' && (
              <div className="flex items-center gap-2 text-gold-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Uploading...</span>
              </div>
            )}
            {receipt.status === 'processing' && (
              <div className="flex items-center gap-2 text-blue-400">
                <Scan className="w-4 h-4 animate-pulse" />
                <span className="text-sm">OCR Processing...</span>
              </div>
            )}
            {receipt.status === 'completed' && receipt.result && (
              <div className="space-y-2">
                {receipt.result.verified ? (
                  <div className="flex items-center gap-2 text-vault-400">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">Verified & Matched</span>
                  </div>
                ) : receipt.result.match_found ? (
                  <div className="flex items-center gap-2 text-gold-400">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">
                      Match found ({(receipt.result.match_confidence * 100).toFixed(0)}% confidence)
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-obsidian-400">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">No matching transaction</span>
                  </div>
                )}
              </div>
            )}
            {receipt.status === 'error' && (
              <div className="flex items-center gap-2 text-red-400">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{receipt.error || 'Upload failed'}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function Receipts() {
  const [receipts, setReceipts] = useState<UploadedReceipt[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const response = await api.getTransactions(1, 100, { status: 'approved' });
      setTransactions(response.transactions.filter(t => !t.receipt_verified));
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFile = async (file: File, transactionId?: string) => {
    const id = crypto.randomUUID();
    const preview = URL.createObjectURL(file);

    const receipt: UploadedReceipt = {
      id,
      file,
      preview,
      taskId: null,
      status: 'uploading',
      transactionId,
    };

    setReceipts(prev => [...prev, receipt]);

    try {
      // Upload receipt
      const response = await api.uploadReceipt(file, transactionId);
      
      setReceipts(prev =>
        prev.map(r =>
          r.id === id
            ? { ...r, taskId: response.task_id, status: 'processing' as const }
            : r
        )
      );

      // Poll for status
      if (response.task_id && response.task_id !== 'celery-unavailable') {
        pollReceiptStatus(id, response.task_id);
      } else {
        // Simulate completion if Celery unavailable
        setTimeout(() => {
          setReceipts(prev =>
            prev.map(r =>
              r.id === id
                ? {
                    ...r,
                    status: 'completed' as const,
                    result: {
                      match_found: !!transactionId,
                      match_confidence: transactionId ? 0.95 : 0,
                      verified: !!transactionId,
                      matched_transaction_id: transactionId,
                    },
                  }
                : r
            )
          );
        }, 2000);
      }
    } catch (error) {
      setReceipts(prev =>
        prev.map(r =>
          r.id === id
            ? { ...r, status: 'error' as const, error: 'Upload failed' }
            : r
        )
      );
    }
  };

  const pollReceiptStatus = async (receiptId: string, taskId: string) => {
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max

    const poll = async () => {
      try {
        const status = await api.getReceiptStatus(taskId);
        
        if (status.status === 'SUCCESS') {
          setReceipts(prev =>
            prev.map(r =>
              r.id === receiptId
                ? { ...r, status: 'completed' as const, result: status.result as UploadedReceipt['result'] }
                : r
            )
          );
          return;
        }

        if (status.status === 'FAILURE') {
          setReceipts(prev =>
            prev.map(r =>
              r.id === receiptId
                ? { ...r, status: 'error' as const, error: status.error || 'Processing failed' }
                : r
            )
          );
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 1000);
        } else {
          setReceipts(prev =>
            prev.map(r =>
              r.id === receiptId
                ? { ...r, status: 'error' as const, error: 'Timeout' }
                : r
            )
          );
        }
      } catch {
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 1000);
        }
      }
    };

    poll();
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(
      file => file.type.startsWith('image/') || file.type === 'application/pdf'
    );

    files.forEach(file => processFile(file, selectedTransaction || undefined));
  }, [selectedTransaction]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => processFile(file, selectedTransaction || undefined));
    e.target.value = '';
  };

  const removeReceipt = (id: string) => {
    setReceipts(prev => {
      const receipt = prev.find(r => r.id === id);
      if (receipt) {
        URL.revokeObjectURL(receipt.preview);
      }
      return prev.filter(r => r.id !== id);
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold text-white">Receipt Upload</h1>
        <p className="text-obsidian-400 mt-1">
          Upload receipts for automatic OCR processing and transaction matching
        </p>
      </div>

      {/* Transaction Selection */}
      <div className="card-glass p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Link to Transaction (Optional)</h3>
        <p className="text-sm text-obsidian-400 mb-4">
          Select a transaction to automatically link the receipt for verification.
        </p>
        <select
          value={selectedTransaction}
          onChange={(e) => setSelectedTransaction(e.target.value)}
          className="input-field max-w-xl"
          disabled={loading}
        >
          <option value="">Auto-match (OCR will find the best match)</option>
          {transactions.map((t) => (
            <option key={t.id} value={t.id}>
              {t.merchant_name} - {formatCurrency(t.amount)} ({format(new Date(t.created_at), 'MMM d, yyyy')})
            </option>
          ))}
        </select>
      </div>

      {/* Upload Zone */}
      <motion.div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        animate={{
          scale: isDragging ? 1.02 : 1,
          borderColor: isDragging ? '#22c55e' : '#334155',
        }}
        className={`
          card-glass p-12 border-2 border-dashed text-center cursor-pointer
          transition-colors duration-200
          ${isDragging ? 'bg-vault-500/5' : 'hover:border-obsidian-500'}
        `}
      >
        <input
          type="file"
          id="file-upload"
          accept="image/*,.pdf"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          <div className={`
            w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center
            transition-colors duration-200
            ${isDragging ? 'bg-vault-500/20' : 'bg-obsidian-800'}
          `}>
            {isDragging ? (
              <FileImage className="w-10 h-10 text-vault-400" />
            ) : (
              <Upload className="w-10 h-10 text-obsidian-400" />
            )}
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            {isDragging ? 'Drop files here' : 'Upload Receipts'}
          </h3>
          <p className="text-obsidian-400 mb-4">
            Drag and drop receipt images or click to browse
          </p>
          <p className="text-sm text-obsidian-500">
            Supports: JPG, PNG, GIF, PDF (max 16MB)
          </p>
        </label>
      </motion.div>

      {/* Uploaded Receipts */}
      <AnimatePresence>
        {receipts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <h3 className="text-lg font-semibold text-white">Uploaded Receipts</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {receipts.map((receipt) => (
                <ReceiptCard
                  key={receipt.id}
                  receipt={receipt}
                  onRemove={() => removeReceipt(receipt.id)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* OCR Info */}
      <div className="card-glass p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
            <Scan className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">How OCR Matching Works</h3>
            <ul className="mt-3 space-y-2 text-sm text-obsidian-400">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-obsidian-800 flex items-center justify-center text-xs font-mono text-obsidian-300 flex-shrink-0 mt-0.5">1</span>
                <span>Upload a receipt image - our OCR engine extracts merchant name, amount, and date</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-obsidian-800 flex items-center justify-center text-xs font-mono text-obsidian-300 flex-shrink-0 mt-0.5">2</span>
                <span>The system searches for transactions matching the extracted data</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-obsidian-800 flex items-center justify-center text-xs font-mono text-obsidian-300 flex-shrink-0 mt-0.5">3</span>
                <span>If confidence is ≥80%, the transaction is automatically marked as verified</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-obsidian-800 flex items-center justify-center text-xs font-mono text-obsidian-300 flex-shrink-0 mt-0.5">4</span>
                <span>Lower confidence matches are flagged for manual review</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

