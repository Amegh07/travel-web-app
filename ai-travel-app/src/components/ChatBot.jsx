import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { chatWithAI } from '../services/api';

const ChatBot = ({ destination }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: 'assistant', text: `Hi! I'm Travex AI. Ask me anything about ${destination || "your trip"}!` }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const data = await chatWithAI(`Context: User is planning trip to ${destination}. Question: ${input}`);
    setMessages(prev => [...prev, { role: 'assistant', text: data.reply }]);
    setLoading(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.9 }} className="bg-slate-900 border border-white/10 w-80 h-96 rounded-2xl shadow-2xl overflow-hidden flex flex-col mb-4">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 flex justify-between items-center">
              <h3 className="text-white font-bold flex items-center gap-2"><Sparkles size={16}/> Travex AI</h3>
              <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white"><X size={18}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-xl text-sm ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white/10 text-slate-200'}`}>{m.text}</div>
                </div>
              ))}
              {loading && <div className="flex justify-start"><div className="bg-white/10 p-3 rounded-xl"><Loader2 className="animate-spin text-white" size={16}/></div></div>}
              <div ref={scrollRef}/>
            </div>
            <div className="p-3 bg-black/20 border-t border-white/5 flex gap-2">
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSend()} placeholder="Ask about food, spots..." className="flex-1 bg-transparent text-white text-sm outline-none placeholder-slate-500"/>
              <button onClick={handleSend} disabled={loading} className="text-blue-400 hover:text-blue-300"><Send size={18}/></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <button onClick={() => setIsOpen(!isOpen)} className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-full shadow-lg text-white hover:scale-110 transition-transform">
        {isOpen ? <X size={24}/> : <MessageCircle size={24}/>}
      </button>
    </div>
  );
};

export default ChatBot;