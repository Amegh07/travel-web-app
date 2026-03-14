import { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2, Sparkles } from 'lucide-react';
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
    setMessages(prev => [...prev, { role: 'assistant', text: data?.reply || "Sorry, I couldn't process that. Please try again." }]);
    setLoading(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.9 }} className="bg-[#FDFCFA]/90 backdrop-blur-xl border border-[#E8E4DC] w-80 h-96 rounded-3xl shadow-[0_16px_48px_rgba(28,25,22,0.1)] overflow-hidden flex flex-col mb-4">
            <div className="bg-[#F4F1EB] border-b border-[#E8E4DC] p-4 flex justify-between items-center">
              <h3 className="text-[#1C1916] serif-text text-xl font-light tracking-tight flex items-center gap-2"><Sparkles className="text-[#B89A6A]" size={16} /> Travex AI</h3>
              <button onClick={() => setIsOpen(false)} className="text-[#9C9690] hover:text-[#1C1916] transition-colors"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-[0_2px_8px_rgba(28,25,22,0.04)] ${m.role === 'user' ? 'bg-[#1C1916] text-[#FDFCFA] rounded-tr-sm' : 'bg-[#F4F1EB] text-[#1C1916] border border-[#E8E4DC] rounded-tl-sm'}`}>{m.text}</div>
                </div>
              ))}
              {loading && <div className="flex justify-start"><div className="bg-[#F4F1EB] border border-[#E8E4DC] shadow-sm p-3 rounded-2xl rounded-tl-sm"><Loader2 className="animate-spin text-[#B89A6A]" size={16} /></div></div>}
              <div ref={scrollRef} />
            </div>
            <div className="p-3 bg-[#FDFCFA] border-t border-[#E8E4DC] flex items-center gap-2">
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Ask about food, spots..." className="flex-1 bg-transparent text-[#1C1916] text-sm outline-none placeholder-[#9C9690] px-2 font-medium" />
              <button onClick={handleSend} disabled={loading} className="text-[#FDFCFA] bg-[#1C1916] hover:bg-[#2E3C3A] p-2 rounded-xl transition-colors shadow-sm disabled:opacity-50"><Send size={16} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <button onClick={() => setIsOpen(!isOpen)} className="bg-[#B89A6A] hover:bg-[#A8876A] p-2.5 rounded-2xl shadow-[0_8px_24px_rgba(184,154,106,0.3)] text-[#FDFCFA] hover:scale-105 transition-all relative w-14 h-14 flex items-center justify-center border border-[#B89A6A]/50">
        {isOpen ? <X size={24} /> : (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 drop-shadow-sm">
            {/* Background Circle to clip the peeking mascot */}
            <circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity="0.2" />

            {/* Mascot Body & Head peeking from bottom */}
            <path d="M7 16C7 13.2386 9.23858 11 12 11C14.7614 11 17 13.2386 17 16V20H7V16Z" fill="currentColor" />

            {/* Ears */}
            <path d="M7.5 13C7.5 13 5 11 6 8.5C7 6 9 8 9 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M16.5 13C16.5 13 19 11 18 8.5C17 6 15 8 15 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />

            {/* Eyes */}
            <circle cx="10" cy="14" r="1" fill="#1C1916" />
            <circle cx="14" cy="14" r="1" fill="#1C1916" />

            {/* Nose/Snout */}
            <path d="M12 16.5C12.8284 16.5 13.5 15.8284 13.5 15C13.5 14.1716 12 15 12 15C12 15 10.5 14.1716 10.5 15C10.5 15.8284 11.1716 16.5 12 16.5Z" fill="#1C1916" />
          </svg>
        )}
      </button>
    </div>
  );
};

export default ChatBot;