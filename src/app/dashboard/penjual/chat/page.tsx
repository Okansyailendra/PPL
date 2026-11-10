'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';
import type { ChatMessage } from '@/types';
import {
  Sparkles,
  TrendingUp,
  MessageSquare,
  Tag,
  ArrowRight,
  Send,
  Trash2,
  RefreshCw,
  Bot,
  User,
} from 'lucide-react';

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Suggested prompts matching the mockup
  const quickPrompts = [
    {
      title: 'Analisis Produk',
      text: 'Apa saja produk yang paling laku minggu ini?',
      icon: TrendingUp,
    },
    {
      title: 'Template Tagih Kasbon',
      text: 'Buatkan pesan WhatsApp sopan untuk menagih kasbon.',
      icon: MessageSquare,
    },
    {
      title: 'Promo & Diskon',
      text: 'Bagaimana cara membuat promo paket sembako hemat?',
      icon: Tag,
    },
  ];

  // Load chat history from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('warungcopilot_chat_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      } catch (e) {
        console.error('Failed to load chat history', e);
      }
    }
    setIsInitialized(true);
  }, []);

  // Save chat history to localStorage whenever messages change
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('warungcopilot_chat_history', JSON.stringify(messages));
    }
  }, [messages, isInitialized]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendPrompt = async (promptText: string) => {
    if (!promptText.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: promptText };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });

      const data = await response.json();

      if (data.error) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `Error: ${data.error}` },
        ]);
      } else {
        setMessages((prev) => [...prev, data]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Maaf, terjadi kesalahan saat menghubungi AI.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleSendPrompt(input);
  };

  const clearChatHistory = () => {
    if (confirm('Bersihkan seluruh riwayat percakapan dengan Copilot AI?')) {
      setMessages([]);
      localStorage.removeItem('warungcopilot_chat_history');
    }
  };

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto pb-12 font-sans">
      {/* 1. Breadcrumb & Page Header */}
      <div className="mb-6">
        <span className="text-[11px] font-bold tracking-wider text-neutral-400 uppercase mb-1 block">
          ASISTEN PINTAR WARUNG
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
          Ada yang bisa dibantu?
        </h1>
        <p className="text-[11px] font-bold tracking-wider text-neutral-400 uppercase mt-1">
          TANYAKAN APA SAJA SEPUTAR PENGELOLAAN WARUNG ANDA
        </p>
      </div>

      {/* 2. Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: Lime Green Hero Card (4 Cols) */}
        <div className="lg:col-span-4 bg-[#cbf14e] rounded-2xl p-6 sm:p-7 shadow-xs flex flex-col justify-between">
          <div>
            {/* Sparkles Icon */}
            <div className="w-10 h-10 rounded-xl bg-[#1c240d]/10 flex items-center justify-center text-[#1c240d] mb-4">
              <Sparkles className="w-5 h-5" />
            </div>

            <span className="text-[10px] font-extrabold tracking-wider text-[#354614] uppercase block mb-2">
              COPILOT AI WARUNG
            </span>

            <h2 className="text-2xl sm:text-3xl font-black text-[#1c240d] leading-tight mb-3">
              Teman berpikir <br />
              untuk warung <br />
              Anda.
            </h2>

            <p className="text-xs text-[#2a3810] font-medium leading-relaxed mb-6">
              Mulai dengan pertanyaan sederhana: strategi produk terlaris, cara menagih kasbon ramah, sampai analisis margin penjualan.
            </p>

            {/* Topik Populer */}
            <div className="pt-4 border-t border-[#1c240d]/15">
              <span className="text-[10px] font-extrabold tracking-wider text-[#354614] uppercase block mb-2.5">
                CONTOH TOPIK POPULER
              </span>
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSendPrompt('Bagaimana strategi restock barang agar tidak menumpuk tapi tidak pernah kehabisan stok?')}
                  className="text-left text-xs font-bold text-[#1c240d] hover:underline cursor-pointer"
                >
                  &bull; Strategi Stok
                </button>
                <button
                  type="button"
                  onClick={() => handleSendPrompt('Berikan tips mengelola piutang kasbon pelanggan agar tetap ramah dan lancar dibayar.')}
                  className="text-left text-xs font-bold text-[#1c240d] hover:underline cursor-pointer"
                >
                  &bull; Kelola Piutang &amp; Kasbon
                </button>
              </div>
            </div>
          </div>

          {/* Privacy Note at Bottom */}
          <div className="pt-6 mt-6 border-t border-[#1c240d]/15">
            <p className="text-[11px] text-[#3a4c16] leading-normal font-medium">
              Data warung Anda aman dan hanya digunakan untuk analisis operasional warung ini.
            </p>
          </div>
        </div>

        {/* Right Column: Assistant Chat Interface (8 Cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-neutral-200 shadow-xs flex flex-col justify-between p-6 sm:p-7 min-h-[580px]">
          {/* Card Top Header */}
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100 mb-4">
            <span className="text-[10px] font-extrabold tracking-wider text-neutral-400 uppercase">
              AI ASSISTANT ANDA
            </span>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Online &amp; Siap Membantu</span>
              </div>

              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={clearChatHistory}
                  title="Bersihkan chat"
                  className="text-neutral-400 hover:text-red-500 transition-colors p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Chat Body & Conversation History */}
          <div className="flex-1 overflow-y-auto max-h-[460px] pr-1 space-y-4 mb-4">
            {/* Initial Welcome & Quick Prompts */}
            {messages.length === 0 ? (
              <div className="animate-fadeIn">
                <h2 className="text-xl sm:text-2xl font-black text-neutral-900 mb-1">
                  Halo! Saya Copilot AI Anda.
                </h2>
                <p className="text-xs sm:text-sm text-neutral-500 mb-6">
                  Ada yang bisa saya bantu tentang warung atau operasional Anda hari ini?
                </p>

                {/* Suggested Prompts List */}
                <div className="space-y-2.5">
                  <span className="text-[10px] font-extrabold tracking-wider text-neutral-400 uppercase block">
                    BISA LANGSUNG TANYA INI:
                  </span>

                  {quickPrompts.map((qp, idx) => {
                    const IconComponent = qp.icon;
                    return (
                      <div
                        key={idx}
                        onClick={() => handleSendPrompt(qp.text)}
                        className="p-3.5 bg-white hover:bg-[#fbfcf9] border border-neutral-200 hover:border-[#cbf14e] rounded-xl flex items-center justify-between gap-3 transition-all cursor-pointer shadow-2xs group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-[#eef5db] text-[#465427] flex items-center justify-center shrink-0">
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-xs font-bold text-neutral-900 group-hover:text-[#465427] transition-colors">
                              {qp.title}
                            </h3>
                            <p className="text-xs text-neutral-500 truncate mt-0.5">
                              &ldquo;{qp.text}&rdquo;
                            </p>
                          </div>
                        </div>

                        <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-[#465427] group-hover:translate-x-0.5 transition-all shrink-0" />
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Conversation Messages */
              <div className="space-y-3.5">
                {messages.map((msg, idx) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div
                      key={idx}
                      className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fadeIn`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                          isUser
                            ? 'bg-[#465427] text-white rounded-tr-none shadow-xs'
                            : 'bg-[#fbfcfa] text-neutral-800 border border-neutral-200/90 rounded-tl-none shadow-2xs'
                        }`}
                      >
                        {!isUser && (
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#465427] mb-1.5">
                            <Bot className="w-3.5 h-3.5" />
                            <span>Copilot AI</span>
                          </div>
                        )}
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  );
                })}

                {isLoading && (
                  <div className="flex justify-start animate-fadeIn">
                    <div className="bg-[#fbfcfa] border border-neutral-200 rounded-2xl rounded-tl-none p-3.5 flex items-center gap-2 text-xs text-neutral-500 shadow-2xs">
                      <RefreshCw className="w-3.5 h-3.5 text-[#465427] animate-spin" />
                      <span>Copilot sedang berpikir &amp; menganalisis data warung...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Bottom Chat Input Form */}
          <div className="pt-2">
            <form
              onSubmit={handleSubmit}
              className="border border-neutral-300 rounded-xl p-1.5 pl-4 flex items-center justify-between gap-3 bg-white shadow-xs focus-within:border-[#465427] transition"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Tanyakan hal seputar stok, kasir, atau kasbon warung..."
                className="w-full text-xs sm:text-sm text-neutral-800 placeholder:text-neutral-400 bg-transparent focus:outline-none"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="px-5 py-2.5 bg-[#465427] hover:bg-[#3b4721] text-white font-bold text-xs rounded-lg transition flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-40"
              >
                <span>Kirim</span>
                <Send className="w-3 h-3" />
              </button>
            </form>

            <span className="text-[11px] text-neutral-400 text-center block mt-2.5">
              AI dapat membuat kesalahan. Selalu periksa kembali keputusan bisnis Anda.
            </span>
          </div>
        </div>
      </div>

      {/* 3. Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-neutral-400 font-medium pt-8 pb-4 border-t border-neutral-200/60 mt-8">
        <span>Wadira | Meja operasional warung</span>
        <span>Asisten AI Warung Madura Digital</span>
      </div>
    </div>
  );
}
