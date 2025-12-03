import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  X,
  Send,
  Bot,
  User,
  Sparkles,
  Minimize2,
  Maximize2
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  model?: string;
  isTyping?: boolean;
}

const SYSTEM_CONTEXT = `You are CorpSpend AI Assistant - a friendly, helpful guide for the CorpSpend platform.

Your personality:
- Warm, conversational, and approachable - like a helpful colleague
- Use casual but professional language
- Show enthusiasm when helping
- Use emojis sparingly but naturally (1-2 per response max)
- Keep responses concise but complete
- Avoid robotic bullet lists - use flowing sentences instead

About CorpSpend:
- Enterprise corporate spend management platform
- Features: Dashboard, Cards, Transactions, Receipts (OCR), Settings
- Fraud detection blocks transactions over $5,000 and blacklisted merchants
- Receipt OCR auto-matches with 80%+ confidence

When answering:
- Start with a friendly acknowledgment
- Explain in conversational sentences, not bullet lists
- End with an offer to help more or a relevant follow-up suggestion
- Be helpful and human, never robotic`;

// Typing effect hook
function useTypingEffect(text: string, speed: number = 20, enabled: boolean = true) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setDisplayedText(text);
      setIsComplete(true);
      return;
    }

    setDisplayedText('');
    setIsComplete(false);
    
    if (!text) return;

    let index = 0;
    const timer = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        index++;
      } else {
        setIsComplete(true);
        clearInterval(timer);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed, enabled]);

  return { displayedText, isComplete };
}

// Typing indicator component
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-2">
      <motion.div
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
        className="w-2 h-2 bg-vault-400 rounded-full"
      />
      <motion.div
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
        className="w-2 h-2 bg-vault-400 rounded-full"
      />
      <motion.div
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
        className="w-2 h-2 bg-vault-400 rounded-full"
      />
    </div>
  );
}

// Message component with typing effect
function ChatMessage({ message, isLatest }: { message: Message; isLatest: boolean }) {
  const shouldAnimate = message.role === 'assistant' && isLatest && !message.isTyping;
  const { displayedText, isComplete } = useTypingEffect(
    message.content,
    15,
    shouldAnimate
  );

  const content = shouldAnimate ? displayedText : message.content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
    >
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          message.role === 'user'
            ? 'bg-vault-500/20 text-vault-400'
            : 'bg-obsidian-800 text-obsidian-300'
        }`}
      >
        {message.role === 'user' ? (
          <User className="w-4 h-4" />
        ) : (
          <Bot className="w-4 h-4" />
        )}
      </div>
      <div
        className={`max-w-[80%] p-3 rounded-xl text-sm ${
          message.role === 'user'
            ? 'bg-vault-500/20 text-obsidian-100 rounded-tr-none'
            : 'bg-obsidian-800 text-obsidian-200 rounded-tl-none'
        }`}
      >
        {message.isTyping ? (
          <TypingIndicator />
        ) : (
          <>
            <p className="whitespace-pre-wrap leading-relaxed">{content}</p>
            {(!shouldAnimate || isComplete) && (
              <div className="flex items-center gap-2 mt-2">
                <p className="text-[10px] text-obsidian-500">
                  {message.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
                {message.model && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-obsidian-700 text-obsidian-400">
                    {message.model}
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hey there! 👋 I'm your CorpSpend assistant. Whether you need help with cards, transactions, or anything else - I'm here for you. What can I help you with?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    // Add typing indicator
    const typingId = crypto.randomUUID();
    const typingMessage: Message = {
      id: typingId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isTyping: true,
    };

    setMessages((prev) => [...prev, userMessage, typingMessage]);
    setInput('');
    setIsLoading(true);

    // Simulate human-like delay (0.5-1.5 seconds)
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    try {
      const response = await fetch('/api/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          context: SYSTEM_CONTEXT,
          history: messages.slice(-6).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      // Replace typing indicator with actual message
      setMessages((prev) => prev.map(m => 
        m.id === typingId 
          ? {
              ...m,
              content: data.response || "Hmm, I couldn't quite process that. Mind rephrasing?",
              isTyping: false,
              model: data.model,
            }
          : m
      ));
    } catch (error) {
      console.error('Chat error:', error);
      // Replace typing indicator with error message
      setMessages((prev) => prev.map(m =>
        m.id === typingId
          ? {
              ...m,
              content: "Oops! I'm having a bit of trouble connecting right now. Give me a moment and try again? 🔄",
              isTyping: false,
            }
          : m
      ));
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickQuestions = [
    'How do I create a new card?',
    'What triggers fraud detection?',
    'How does receipt OCR work?',
  ];

  return (
    <>
      {/* Chat Toggle Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-vault-500 to-vault-600 text-white shadow-lg shadow-vault-500/30 flex items-center justify-center"
          >
            <MessageCircle className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed z-50 ${
              isExpanded
                ? 'inset-4 md:inset-8'
                : 'bottom-6 right-6 w-[380px] h-[600px] max-h-[80vh]'
            } transition-all duration-300`}
          >
            <div className="h-full flex flex-col bg-obsidian-900 border border-obsidian-700/50 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-vault-600 to-vault-500 text-white">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">CorpSpend AI</h3>
                    <p className="text-xs text-white/70">Your Finance Assistant</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    {isExpanded ? (
                      <Minimize2 className="w-4 h-4" />
                    ) : (
                      <Maximize2 className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message, index) => (
                  <ChatMessage 
                    key={message.id} 
                    message={message} 
                    isLatest={index === messages.length - 1}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Questions */}
              {messages.length === 1 && (
                <div className="px-4 pb-2">
                  <p className="text-xs text-obsidian-400 mb-2">Quick questions:</p>
                  <div className="flex flex-wrap gap-2">
                    {quickQuestions.map((q) => (
                      <button
                        key={q}
                        onClick={() => {
                          setInput(q);
                          inputRef.current?.focus();
                        }}
                        className="text-xs px-3 py-1.5 rounded-lg bg-obsidian-800 text-obsidian-300 hover:bg-obsidian-700 hover:text-obsidian-100 transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="p-4 border-t border-obsidian-700/50">
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask me anything..."
                    className="flex-1 px-4 py-3 bg-obsidian-800 border border-obsidian-600 rounded-xl text-obsidian-100 placeholder-obsidian-400 focus:outline-none focus:ring-2 focus:ring-vault-500/30 focus:border-vault-500 text-sm"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || isLoading}
                    className="w-11 h-11 rounded-xl bg-vault-500 hover:bg-vault-400 disabled:bg-obsidian-700 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

