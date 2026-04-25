/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { 
  Send, 
  Sparkles, 
  Terminal, 
  Cpu,
  ChevronRight,
  Plus,
  MessageSquare,
  X,
  Menu,
  Map as MapIcon,
  MessageCircle,
  TrendingUp,
  Box,
  ArrowUpRight,
  Settings,
  ShieldCheck,
  AlertTriangle
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { motion, AnimatePresence } from "motion/react";

// Types
export interface Message {
  role: "user" | "model";
  content: string;
  id: string;
  timestamp: number;
}

type Tab = "chat" | "map" | "capacity" | "sales";

// Same-origin in production (Cloud Run serves the frontend and /api on the same host).
// Falls back to the local dev server so `npm run dev` still works against a locally-run Javalin.
const API_BASE = (import.meta.env.VITE_API_BASE ?? "http://localhost:8080").replace(/\/$/, "");

export default function App() {
  // State Management
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const [isMapPopupOpen, setIsMapPopupOpen] = useState(false);
  
  // MERGED FEATURE: Dynamic Chat History
  const [history, setHistory] = useState<{ title: string; messages: Message[] }[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [dbInventory, setDbInventory] = useState<any[]>([]);
  const [dbSales, setDbSales] = useState<any[]>([]);

  // Real-time Database Sync
  useEffect(() => {
    const fetchDbData = async () => {
      try {
        const invRes = await fetch(`${API_BASE}/api/inventory`);
        const salesRes = await fetch(`${API_BASE}/api/velocity`);
        
        if (invRes.ok) {
          const invData = await invRes.json();
          setDbInventory(invData);
        }

        if (salesRes.ok) {
          const salesData = await salesRes.json();
          setDbSales(salesData);
        }
      } catch (error) {
        console.error("Database Sync Error:", error);
      }
    };

    fetchDbData();
    const interval = setInterval(fetchDbData, 5000); 
    return () => clearInterval(interval);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, activeTab]);

  useEffect(() => {
    if (messages.length === 0) {
      const initialGreeting: Message = {
        role: "model",
        content: "Welcome to Zai Warehouse Intelligence. I am online. Has a delivery arrived, or do you have an inventory query?",
        id: "initial-greeting",
        timestamp: Date.now(),
      };
      setMessages([initialGreeting]);
    }
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage: Message = {
      role: "user",
      content: input,
      id: Date.now().toString(),
      timestamp: Date.now()
    };

    const userMessagesOnly = messages.filter(m => m.role === "user");
    if (userMessagesOnly.length === 0) {
      setHistory(prev => [
        { title: input || "Inventory Query", messages: [...messages, userMessage] },
        ...prev
      ].slice(0, 8));
    }

    const currentInput = input;
    setInput("");
    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    try {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: currentInput }),
      });

      if (!response.ok) throw new Error("Backend server is offline");
      const data = await response.json();

      const botMessage: Message = {
        role: "model",
        content: data.reply, 
        id: (Date.now() + 1).toString(),
        timestamp: Date.now(),
      };
      
      setMessages((prev) => [...prev, botMessage]);

      setHistory(prev => {
        if (prev.length === 0) return prev;
        const updated = [...prev];
        updated[0] = { ...updated[0], messages: [...updated[0].messages, botMessage] };
        return updated;
      });

    } catch (error) {
      const errorMessage: Message = {
        role: "model",
        content: "I couldn't reach the Zai Server. Make sure your Java terminal shows 'Server is live'!",
        id: (Date.now() + 1).toString(),
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  // Sales View
  const SalesView = () => {
    const dataToDisplay = dbSales.length > 0 ? dbSales : [];
    
      // Logic to calculate % difference between the last two numbers in a string
      const calculateGrowth = (saleDataString: string) => {
        if (!saleDataString) return "0%";
        const salesArray = saleDataString.split(',').map(Number);
        if (salesArray.length < 2) return "0%";

        const current = salesArray[salesArray.length - 1];
        const previous = salesArray[salesArray.length - 2];
        if (previous === 0) return "+100%";
        
        const growth = ((current - previous) / previous) * 100;
        return `${growth >= 0 ? '+' : ''}${growth.toFixed(0)}%`;
      };
    return (
      <div className="flex-1 overflow-y-auto bg-[#0F0F12] p-4 sm:p-8 pb-32 scroll-soft">
        <div className="max-w-4xl mx-auto space-y-8">
          <header className="space-y-2">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-indigo-500" />
              <h2 className="text-2xl font-semibold text-white tracking-tight">Sales Velocity</h2>
            </div>
            <p className="text-white/40 text-sm font-light">Product Throughput Analysis (Live DB Sync)</p>
          </header>

          <div className="bg-[#16161A] border border-white/5 rounded-2xl p-6 h-[400px] backdrop-blur-md shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <span className="text-xs font-bold text-white/40 tracking-widest uppercase font-mono">Throughput Matrix (Units)</span>
            </div>
            
            <ResponsiveContainer width="100%" height="80%">
              <BarChart data={dataToDisplay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#23232A" vertical={false} />
                <XAxis dataKey="name" stroke="#A8A8B3" fontSize={9} tickLine={false} axisLine={false} interval={0} angle={-25} textAnchor="end" height={60} />
                <YAxis hide />
                <Tooltip contentStyle={{ backgroundColor: '#16161A', border: '1px solid #23232A', borderRadius: '12px' }} itemStyle={{ color: '#E1E1E6' }} />
                <Bar dataKey="velocity" radius={[4, 4, 0, 0]} barSize={40}>
                  {dataToDisplay.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#6366F1' : '#312E81'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dataToDisplay.map((product, idx) => {
              const growthValue = calculateGrowth(product.sale_data);
              const isPositive = !growthValue.startsWith('-');
            return(
              <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-xl p-5 hover:border-indigo-500/30 transition-all group">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-indigo-500/10 transition-colors">
                      <Box className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-white truncate max-w-[150px]">{product.name}</h3>
                      <p className="text-[10px] text-white/20 font-mono">DB-REF-{idx}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-mono font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {growthValue}
                </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] uppercase font-bold tracking-tighter">
                    <span className="text-white/20">Velocity Score</span>
                    <span className="text-indigo-400">{product.velocity} units</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(product.velocity, 100)}%` }} transition={{ duration: 1, ease: "easeOut" }} className="h-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.4)]" />
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        </div>
      </div>
    );
  };

  // MapView (Directory)
  const MapView = () => {
    const aisles = ["A 1", "A 2", "A 3"];
    const sections = ["S1", "S2"];
    const levels = ["L3", "L2", "L1"]; 
    const bins = ["B1", "B2", "B3"];

    return (
      <div className="flex-1 overflow-y-auto bg-[#0F0F12] p-4 pb-32 sm:p-8 sm:pb-40">
        <div className="max-w-6xl mx-auto space-y-8">
          <header className="space-y-1">
            <h2 className="text-3xl font-bold text-white tracking-tight">Warehouse Directory</h2>
            <p className="text-white/40 text-sm font-light">Inventory Map: Aisles A1 - A3 | Total 54 Bins</p>
          </header>

          <div className="grid grid-cols-4 gap-4 bg-white/[0.03] p-6 rounded-2xl border border-white/5">
            {[{ label: "AISLE", code: "(A)", desc: "Main Path" }, { label: "SHELF", code: "(S)", desc: "Unit" }, { label: "LEVEL", code: "(L)", desc: "Height" }, { label: "BIN", code: "(B)", desc: "Storage" }].map((item) => (
              <div key={item.label} className="space-y-1">
                <p className="text-[10px] text-white/20 font-bold tracking-widest">{item.label}</p>
                <div className="flex items-center gap-2">
                  <span className="text-blue-500 font-bold">{item.code}</span>
                  <span className="text-white/60 text-xs">{item.desc}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="relative flex items-stretch gap-3 pt-8 pb-12 border-b border-dashed border-white/10">
            <div className="bg-[#1C1C21] border border-white/10 rounded-xl p-3 sm:p-4 flex items-center gap-2 sm:gap-4 flex-1 sm:flex-none sm:w-64 min-w-0 shadow-lg">
              <div className="text-blue-500/50 opacity-50 shrink-0"><ChevronRight size={18} /></div>
              <div className="flex flex-col min-w-0">
                <span className="text-white/90 text-[10px] font-bold tracking-widest uppercase truncate">Packing Counter</span>
                <span className="text-white/20 text-[8px] font-mono">STAFF ONLY</span>
              </div>
            </div>
            <div className="border border-emerald-500/40 bg-emerald-500/5 rounded-xl p-3 sm:py-3 sm:px-16 flex items-center justify-center flex-1 sm:flex-none sm:absolute sm:left-1/2 sm:-translate-x-1/2 min-w-0">
              <span className="text-emerald-500 font-bold text-[9px] sm:text-[10px] tracking-[0.15em] sm:tracking-[0.3em] uppercase text-center leading-tight">Front Door Entrance</span>
            </div>
          </div>

          <div className="pt-12 -mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto">
            <div className="flex justify-between gap-8 min-w-[720px]">
              {aisles.map((aisleName) => (
                <div key={aisleName} className="flex-1 flex flex-col items-center gap-6">
                  <div className="flex gap-4 w-full">
                    {sections.map((section) => (
                      <div key={`${aisleName}-${section}`} className="flex-1 space-y-2">
                        <span className="text-[10px] font-bold text-white/20 block px-2 uppercase">{aisleName.replace(' ', '')}-{section}</span>
                        <div className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden p-1">
                          <div className="grid grid-cols-3 gap-1">
                            {levels.map((lvl) => (
                              <React.Fragment key={lvl}>
                                {bins.map((bn) => (
                                  <div key={`${lvl}${bn}`} className="aspect-[3/4] border border-white/5 bg-white/[0.01] flex items-center justify-center hover:bg-white/[0.05] transition-colors">
                                    <span className="text-[10px] font-mono font-bold text-white/40 tracking-tighter uppercase">{lvl}{bn}</span>
                                  </div>
                                ))}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <span className="text-xs font-mono text-white/20 tracking-[0.5em]">{aisleName}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // CapacityView
  const CapacityView = () => {
    const getCapacityColor = (val: number, isBlocked?: boolean) => {
      if (isBlocked) return "bg-red-950/60 border-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse";
      if (val > 80) return "bg-red-500/40 border-red-500/50";
      if (val > 50) return "bg-amber-500/40 border-amber-500/50";
      return "bg-emerald-500/40 border-emerald-500/50";
    };

    const getAisleStats = (aisleId: string) => {
      const normalizedSearch = aisleId.trim().toUpperCase();
      const binsInAisle = (dbInventory || []).filter(item => String(item.aisle || "").trim().toUpperCase() === normalizedSearch);
      const activeCount = binsInAisle.filter(item => String(item.blocked_status || "").trim().toLowerCase() === 'clear').length;
      const totalCount = binsInAisle.length || 18;
      return { text: `${activeCount}/${totalCount}`, color: activeCount === totalCount ? 'text-blue-500' : 'text-rose-500' };
    };

    return (
      <div className="flex-1 overflow-y-auto bg-[#0F0F12] p-4 sm:p-8 pb-32">
        <div className="max-w-6xl mx-auto space-y-12">
          <header className="space-y-2">
            <h2 className="text-3xl font-bold text-white tracking-tight">Capacity Analytics</h2>
            <p className="text-white/40 text-sm font-light">Real-time Bin Occupancy & Storage Optimization Matrix</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {['A1', 'A2', 'A3'].map((aisleId) => {
              const stats = getAisleStats(aisleId);
              return (
                <div key={aisleId} className="space-y-6">
                  <div className="flex items-center justify-between px-2">
                    <span className="text-xs font-bold text-white/40 tracking-widest uppercase">AISLE {aisleId}</span>
                    <span className={`text-[10px] font-mono font-bold ${stats.color}`}>{stats.text} active</span>
                  </div>
                  {['S1', 'S2'].map((shelf) => (
                    <div key={shelf} className="bg-[#16161A] border border-white/5 rounded-3xl p-6 space-y-6 shadow-xl">
                      <div className="flex items-center justify-between border-b border-white/5 pb-4">
                        <span className="text-[11px] font-mono text-white/60">Shelf {aisleId}-{shelf}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                          <span className="text-[9px] text-blue-500 font-bold uppercase tracking-tighter">Real-Time</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        {["L3", "L2", "L1"].map((lvl) => (
                          <React.Fragment key={lvl}>
                            {["B1", "B2", "B3"].map((bn) => {
                              const binData = (dbInventory || []).find(item => {
                                  const dbAisle = String(item.aisle || "").replace(/\s+/g, '').toUpperCase();
                                  const uiAisle = String(aisleId || "").replace(/\s+/g, '').toUpperCase();
                                  return dbAisle === uiAisle && 
                                        String(item.shelf || "").trim().toUpperCase() === shelf.toUpperCase() && 
                                        String(item.level || "").trim().toUpperCase() === lvl.toUpperCase() && 
                                        String(item.bin || "").trim().toUpperCase() === bn.toUpperCase();
                              });
                              const statusStr = String(binData?.blocked_status || "").trim().toLowerCase();
                              const isBlocked = binData?.blocked_status ? (statusStr !== 'clear') : false;
                              const cap = binData?.capacity || 0;
                              const p1 = binData?.product1 && binData.product1 !== "NULL" ? binData.product1 : null;
                              const p2 = binData?.product2 && binData.product2 !== "NULL" ? binData.product2 : null;

                              return (
                                <div key={`${lvl}${bn}`} className={`group aspect-square rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all hover:scale-105 relative overflow-visible ${getCapacityColor(cap, isBlocked)}`}>
                                  <span className={`text-[11px] font-bold tracking-tight ${isBlocked ? 'text-red-300' : 'text-white/60'}`}>{lvl}{bn}</span>
                                  <span className={`text-[10px] font-mono font-bold ${isBlocked ? 'text-red-500' : 'text-amber-500'}`}>{isBlocked ? 'OFF' : `${cap}%`}</span>
                                  
                                  {(p1 || p2) && (
                                    <div className="absolute invisible group-hover:visible bottom-full left-1/2 -translate-x-1/2 mb-3 w-48 bg-[#1C1C21] border border-white/10 rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[100] backdrop-blur-2xl transition-all duration-200 scale-95 group-hover:scale-100 opacity-0 group-hover:opacity-100">
                                      <div className="flex items-center gap-2 mb-2">
                                        <Box className="w-3 h-3 text-blue-500" />
                                        <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest">Bin Contents</p>
                                      </div>
                                      <div className="space-y-2 text-left">
                                        {p1 && <div className="flex flex-col gap-0.5"><span className="text-[11px] text-white font-medium">{p1}</span><span className="text-[8px] text-white/20 font-mono tracking-tighter">PRIMARY SLOT</span></div>}
                                        {p2 && <div className="flex flex-col gap-0.5 pt-2 border-t border-white/5"><span className="text-[11px] text-indigo-400 font-medium">{p2}</span><span className="text-[8px] text-white/20 font-mono tracking-tighter">SECONDARY SLOT</span></div>}
                                      </div>
                                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-[#1C1C21]" />
                                    </div>
                                  )}
                                  {isBlocked && <AlertTriangle className="w-2.5 h-2.5 text-red-500 absolute top-2 right-2" />}
                                </div>
                              );
                            })}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-[#08080A] text-[#E1E1E6] font-sans overflow-hidden flex-col">
      <div className="flex-1 flex overflow-hidden relative">
        <aside className={`fixed md:relative z-50 h-[calc(100%-2rem)] w-[300px] m-4 bg-white/[0.04] border border-white/10 backdrop-blur-[60px] flex flex-col transition-all duration-700 shrink-0 rounded-[2.5rem] shadow-2xl ${isSidebarOpen ? "translate-x-0" : "-translate-x-[120%] md:translate-x-0"}`}>
          <div className="p-8 border-b border-white/5">
            <button onClick={() => { clearChat(); setActiveTab("chat"); }} className="flex items-center gap-4 text-white/40 hover:text-white transition-all">
              <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center"><Plus /></div>
              <span>New Analysis</span>
            </button>
          </div>
          <nav className="flex-1 p-6 space-y-4 overflow-y-auto scroll-soft">
            {history.length > 0 ? history.map((item, i) => (
              <button key={i} onClick={() => { setMessages(item.messages); setActiveTab("chat"); setIsSidebarOpen(false); }} className="w-full text-left px-5 py-3 rounded-2xl text-sm text-white/40 hover:bg-white/5 hover:text-white transition-all truncate group flex items-center gap-2">
                <MessageSquare className="w-4 h-4 shrink-0 opacity-20 group-hover:opacity-100 transition-opacity" />
                <span className="truncate">{item.title}</span>
              </button>
            )) : <div className="px-5 py-3 text-xs text-white/10 italic text-center uppercase tracking-widest font-bold">No history log</div>}
          </nav>
        </aside>

        <main className="flex-1 flex flex-col h-full bg-transparent relative overflow-hidden">
          <header className="h-24 border-b border-white/5 flex items-center justify-between px-8 bg-white/[0.02] backdrop-blur-3xl shrink-0">
            <div className="flex items-center gap-4">
              <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-white/40"><Menu /></button>
              <h1 className="text-xl font-medium text-white/90">{activeTab === 'chat' ? 'Zai Intelligence' : 'Warehouse Systems'}</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10 text-[10px] font-mono text-emerald-400">
                <ShieldCheck className="w-3 h-3" /> SECURE NODE
              </div>
            </div>
          </header>

          {activeTab === 'chat' ? (
            <div className="flex-1 overflow-y-auto px-4">
              <div className="max-w-4xl mx-auto py-12 flex flex-col gap-6">
                <AnimatePresence>
                  {messages.map((msg) => (
                    <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold ${msg.role === "user" ? "bg-white/10" : "bg-indigo-500/20 text-indigo-300"}`}>{msg.role === "user" ? "OP" : "AI"}</div>
                      <div className={`max-w-[80%] p-4 rounded-[1.5rem] backdrop-blur-xl border ${msg.role === "user" ? "bg-white/10 border-white/20" : "bg-white/[0.04] border-white/5"}`}>
                        <p className="text-sm font-light leading-relaxed">{msg.content}</p>
                      </div>
                    </motion.div>
                  ))}
                  {isTyping && <div className="text-white/20 text-xs animate-pulse ml-12">System processing...</div>}
                </AnimatePresence>
                <div ref={messagesEndRef} className="h-32" />
              </div>

              <div className="fixed bottom-32 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4">
                <div className="bg-white/[0.02] border border-white/20 backdrop-blur-2xl rounded-[2.5rem] p-2 flex items-center gap-2 shadow-2xl">
                  <button onClick={() => setIsMapPopupOpen(true)} className="p-3 text-white/30 hover:text-white ml-2"><MapIcon className="w-5 h-5"/></button>
                  <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Query inventory..." className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder-white/20 text-sm outline-none px-4" />
                  <button onClick={handleSend} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-indigo-500 transition-all mr-1"><Send className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ) : activeTab === 'capacity' ? <CapacityView /> : activeTab === 'sales' ? <SalesView /> : <MapView />}
        </main>
      </div>

      <div className="fixed bottom-8 left-0 right-0 z-50 flex justify-center px-6">
        <nav className="bg-white/[0.01] border border-white/30 backdrop-blur-md rounded-full px-2 py-1.5 flex gap-1 shadow-2xl">
          {[{ id: "chat", icon: MessageCircle, label: "Intelligence" }, { id: "capacity", icon: Cpu, label: "Capacity" }, { id: "sales", icon: TrendingUp, label: "Velocity" }, { id: "map", icon: MapIcon, label: "Grid" }].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as Tab)} className={`flex items-center gap-2 px-5 py-2.5 rounded-full transition-all ${activeTab === tab.id ? 'bg-white/10 text-white shadow-lg' : 'text-white/20 hover:text-white/40'}`}>
              <tab.icon className="w-4 h-4" />
              {activeTab === tab.id && <span className="text-[10px] font-bold uppercase tracking-widest">{tab.label}</span>}
            </button>
          ))}
        </nav>
      </div>

      <AnimatePresence>
        {isMapPopupOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMapPopupOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full max-w-4xl h-[70vh] bg-[#16161A] border border-white/10 rounded-[3rem] overflow-hidden flex flex-col shadow-2xl">
              <div className="p-8 border-b border-white/5 flex justify-between items-center"><h3 className="text-xl font-medium uppercase tracking-tight font-bold text-white/30">Registry Grid</h3><button onClick={() => setIsMapPopupOpen(false)} className="p-2 bg-white/5 rounded-full"><X /></button></div>
              <div className="flex-1 overflow-y-auto min-h-0"><MapView /></div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}