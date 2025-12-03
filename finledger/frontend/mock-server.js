// Mock API Server for CorpSpend Frontend Demo
// Run with: node mock-server.js

import http from 'http';
import { randomUUID } from 'crypto';

const PORT = 5050;

// In-memory data store
const cards = [
  {
    id: randomUUID(),
    card_number: '****-****-****-4242',
    cardholder_name: 'Sarah Johnson',
    spending_limit: '25000.00',
    current_balance: '12450.00',
    available_balance: '12550.00',
    status: 'active',
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: randomUUID(),
    card_number: '****-****-****-5555',
    cardholder_name: 'Michael Chen',
    spending_limit: '15000.00',
    current_balance: '8920.50',
    available_balance: '6079.50',
    status: 'active',
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: randomUUID(),
    card_number: '****-****-****-1234',
    cardholder_name: 'Emily Davis',
    spending_limit: '10000.00',
    current_balance: '9800.00',
    available_balance: '200.00',
    status: 'active',
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const transactions = [
  {
    id: randomUUID(),
    card_id: cards[0].id,
    amount: '2450.00',
    merchant_name: 'AMAZON WEB SERVICES',
    merchant_category: 'SOFTWARE',
    description: 'Monthly cloud hosting',
    status: 'verified',
    receipt_verified: true,
    receipt_verified_at: new Date().toISOString(),
    fraud_score: '0.0500',
    fraud_reason: null,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: randomUUID(),
    card_id: cards[0].id,
    amount: '189.99',
    merchant_name: 'OFFICE DEPOT',
    merchant_category: 'OFFICE',
    description: 'Printer supplies',
    status: 'approved',
    receipt_verified: false,
    receipt_verified_at: null,
    fraud_score: '0.1200',
    fraud_reason: null,
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: randomUUID(),
    card_id: cards[1].id,
    amount: '4500.00',
    merchant_name: 'DELTA AIRLINES',
    merchant_category: 'TRAVEL',
    description: 'Conference travel',
    status: 'approved',
    receipt_verified: false,
    receipt_verified_at: null,
    fraud_score: '0.2500',
    fraud_reason: null,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: randomUUID(),
    card_id: cards[1].id,
    amount: '6500.00',
    merchant_name: 'SUSPICIOUS_VENDOR_1',
    merchant_category: 'OTHER',
    description: 'Blocked transaction',
    status: 'declined',
    receipt_verified: false,
    receipt_verified_at: null,
    fraud_score: '1.0000',
    fraud_reason: 'Merchant "SUSPICIOUS_VENDOR_1" is on the blacklist',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: randomUUID(),
    card_id: cards[2].id,
    amount: '850.00',
    merchant_name: 'MARRIOTT HOTELS',
    merchant_category: 'TRAVEL',
    description: 'Client meeting accommodation',
    status: 'flagged',
    receipt_verified: false,
    receipt_verified_at: null,
    fraud_score: '0.6500',
    fraud_reason: 'Unusual spending pattern detected',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Helper to parse JSON body
async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
  });
}

// Request handler
async function handleRequest(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  try {
    // Health check
    if (path === '/health') {
      res.writeHead(200);
      res.end(JSON.stringify({ status: 'healthy', service: 'corpspend-mock-api' }));
      return;
    }

    // Cards endpoints
    if (path === '/api/v1/cards' && req.method === 'GET') {
      res.writeHead(200);
      res.end(JSON.stringify({
        cards,
        total: cards.length,
        page: 1,
        per_page: 20,
        has_next: false,
        has_prev: false,
      }));
      return;
    }

    if (path === '/api/v1/cards' && req.method === 'POST') {
      const body = await parseBody(req);
      const newCard = {
        id: randomUUID(),
        card_number: `****-****-****-${body.card_number?.slice(-4) || '0000'}`,
        cardholder_name: body.cardholder_name,
        spending_limit: parseFloat(body.spending_limit).toFixed(2),
        current_balance: '0.00',
        available_balance: parseFloat(body.spending_limit).toFixed(2),
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      cards.unshift(newCard);
      res.writeHead(201);
      res.end(JSON.stringify(newCard));
      return;
    }

    // Single card
    const cardMatch = path.match(/^\/api\/v1\/cards\/([a-f0-9-]+)$/);
    if (cardMatch && req.method === 'GET') {
      const card = cards.find(c => c.id === cardMatch[1]);
      if (card) {
        res.writeHead(200);
        res.end(JSON.stringify(card));
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'CARD_NOT_FOUND', message: 'Card not found' }));
      }
      return;
    }

    // Card balance
    const balanceMatch = path.match(/^\/api\/v1\/cards\/([a-f0-9-]+)\/balance$/);
    if (balanceMatch && req.method === 'GET') {
      const card = cards.find(c => c.id === balanceMatch[1]);
      if (card) {
        res.writeHead(200);
        res.end(JSON.stringify({
          card_id: card.id,
          spending_limit: card.spending_limit,
          current_balance: card.current_balance,
          available_balance: card.available_balance,
          status: card.status,
        }));
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'CARD_NOT_FOUND', message: 'Card not found' }));
      }
      return;
    }

    // Transactions endpoints
    if (path === '/api/v1/transactions' && req.method === 'GET') {
      const status = url.searchParams.get('status');
      let filteredTransactions = transactions;
      if (status) {
        filteredTransactions = transactions.filter(t => t.status === status);
      }
      res.writeHead(200);
      res.end(JSON.stringify({
        transactions: filteredTransactions,
        total: filteredTransactions.length,
        page: 1,
        per_page: 20,
        has_next: false,
        has_prev: false,
      }));
      return;
    }

    if (path === '/api/v1/transactions' && req.method === 'POST') {
      const body = await parseBody(req);
      
      // Fraud detection simulation
      const amount = parseFloat(body.amount);
      const merchantName = body.merchant_name?.toUpperCase() || '';
      const blacklist = ['SUSPICIOUS_VENDOR_1', 'BLACKLISTED_MERCHANT', 'FRAUD_CORP', 'SCAM_ENTERPRISES'];
      
      let status = 'approved';
      let fraudScore = '0.0500';
      let fraudReason = null;

      // Check fraud rules
      if (amount > 5000) {
        res.writeHead(403);
        res.end(JSON.stringify({
          error: 'FRAUD_DETECTED',
          message: 'Transaction blocked by fraud detection',
          details: {
            score: '1.0000',
            reasons: [`Transaction amount $${amount.toFixed(2)} exceeds maximum allowed $5000.00`],
          },
        }));
        return;
      }

      if (blacklist.some(b => merchantName.includes(b))) {
        res.writeHead(403);
        res.end(JSON.stringify({
          error: 'FRAUD_DETECTED',
          message: 'Transaction blocked by fraud detection',
          details: {
            score: '1.0000',
            reasons: [`Merchant "${merchantName}" is on the blacklist`],
          },
        }));
        return;
      }

      // Check card balance
      const card = cards.find(c => c.id === body.card_id);
      if (!card) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'CARD_NOT_FOUND', message: 'Card not found' }));
        return;
      }

      const available = parseFloat(card.available_balance);
      if (amount > available) {
        res.writeHead(402);
        res.end(JSON.stringify({
          error: 'INSUFFICIENT_FUNDS',
          message: `Insufficient funds: requested $${amount.toFixed(2)}, available $${available.toFixed(2)}`,
        }));
        return;
      }

      // Update card balance
      card.current_balance = (parseFloat(card.current_balance) + amount).toFixed(2);
      card.available_balance = (parseFloat(card.spending_limit) - parseFloat(card.current_balance)).toFixed(2);

      const newTransaction = {
        id: randomUUID(),
        card_id: body.card_id,
        amount: amount.toFixed(2),
        merchant_name: merchantName,
        merchant_category: body.merchant_category || null,
        description: body.description || null,
        status,
        receipt_verified: false,
        receipt_verified_at: null,
        fraud_score: fraudScore,
        fraud_reason: fraudReason,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      transactions.unshift(newTransaction);
      res.writeHead(201);
      res.end(JSON.stringify(newTransaction));
      return;
    }

    // Upload receipt
    if (path === '/api/v1/upload-receipt' && req.method === 'POST') {
      const taskId = randomUUID();
      res.writeHead(202);
      res.end(JSON.stringify({
        message: 'Receipt uploaded successfully. OCR processing queued.',
        task_id: taskId,
        transaction_id: null,
        status: 'processing',
      }));
      return;
    }

    // Receipt status
    const receiptMatch = path.match(/^\/api\/v1\/receipts\/status\/([a-f0-9-]+)$/);
    if (receiptMatch && req.method === 'GET') {
      res.writeHead(200);
      res.end(JSON.stringify({
        task_id: receiptMatch[1],
        status: 'SUCCESS',
        result: {
          match_found: true,
          match_confidence: 0.92,
          verified: true,
          ocr_data: {
            merchant: 'OFFICE DEPOT',
            amount: '189.99',
            date: new Date().toISOString().split('T')[0],
          },
        },
      }));
      return;
    }

    // 404 for unknown routes
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'NOT_FOUND', message: 'Endpoint not found' }));

  } catch (error) {
    console.error('Error:', error);
    res.writeHead(500);
    res.end(JSON.stringify({ error: 'INTERNAL_ERROR', message: error.message }));
  }
}

// Create and start server
const server = http.createServer(handleRequest);
server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🏦  CorpSpend Mock API Server                               ║
║                                                               ║
║   Server running at: http://localhost:${PORT}                   ║
║                                                               ║
║   Endpoints:                                                  ║
║   • GET  /health                                              ║
║   • GET  /api/v1/cards                                        ║
║   • POST /api/v1/cards                                        ║
║   • GET  /api/v1/transactions                                 ║
║   • POST /api/v1/transactions                                 ║
║   • POST /api/v1/upload-receipt                               ║
║                                                               ║
║   Fraud Rules Active:                                         ║
║   • Transactions > $5,000 are BLOCKED                         ║
║   • Blacklisted merchants are BLOCKED                         ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

