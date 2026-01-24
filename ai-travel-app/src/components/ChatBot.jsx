import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, Sparkles, MapPin, Utensils, Camera, Wallet } from 'lucide-react';
// REMOVED: import { motion, AnimatePresence } from 'framer-motion';
import { chatWithGemini } from '../services/geminiAPI';

const ChatBot = ({ destination }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, text: `Hi! I'm your AI assistant. Ask me anything about ${destination || 'your trip'}!`, sender: 'bot' }
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const suggestions = [
    { label: "Must-visit spots?", icon: <MapPin size={14} />, text: `What are the top 3 must-visit attractions in ${destination}?` },
    { label: "Best local food?", icon: <Utensils size={14} />, text: `What is the most famous local food in ${destination} and where should I try it?` },
    { label: "Hidden gems?", icon: <Camera size={14} />, text: `Tell me about some hidden gems or non-touristy spots in ${destination}.` },
    { label: "Budget tips?", icon: <Wallet size={14} />, text: `Give me some budget-saving travel tips for ${destination}.` },
  ];

  const formatMessage = (text) => {
    return text.split('\n').map((line, i) => (
      <span key={i} className="block min-h-[1.2em]">
        {line.split(/(\*\*.*?\*\*)/).map((part, j) => 
          part.startsWith('**') && part.endsWith('**') 
            ? <strong key={j} className="text-gray-900 font-bold">{part.slice(2, -2)}</strong> 
            : part
        )}
      </span>
    ));
  };

  const handleSendMessage = async (textOverride = null) => {
    const textToSend = textOverride || inputText;
    if (!textToSend.trim()) return;

    const userMessage = { id: Date.now(), text: textToSend, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);

    try {
      const aiReplyText = await chatWithGemini(textToSend, messages);
      const botMessage = { id: Date.now() + 1, text: aiReplyText, sender: 'bot' };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error("Chat Error:", error);
      const errorMessage = { id: Date.now() + 1, text: "Sorry, I couldn't reach the server.", sender: 'bot' };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end font-sans">
      
      {/* CHAT WINDOW (Standard Div instead of Motion) */}
      {isOpen && (
        <div className="mb-4 w-[340px] md:w-[400px] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[600px]">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex justify-between items-center text-white shadow-md">
              <div className="flex items-center gap-2">
                <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm">
                  <Sparkles size={18} className="text-yellow-300" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Voyager Assistant</h3>
                  <p className="text-[10px] text-blue-100 opacity-90">Online • Helping you explore</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-1.5 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 min-h-[350px]">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.sender === 'bot' && (
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs mr-2 mt-1 shadow-sm shrink-0">
                      AI
                    </div>
                  )}
                  <div className={`max-w-[80%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    msg.sender === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-none' 
                    : 'bg-white text-gray-700 border border-gray-200 rounded-bl-none'
                  }`}>
                    {msg.sender === 'user' ? msg.text : formatMessage(msg.text)}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-2 shrink-0 animate-pulse">...</div>
                  <div className="bg-white p-3 rounded-2xl border border-gray-200 rounded-bl-none shadow-sm flex items-center gap-2 text-gray-400 text-xs">
                    <Loader2 size={14} className="animate-spin" /> Thinking...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggestion Chips */}
            {!isLoading && (
              <div className="bg-gray-50 px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-hide py-2">
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(s.text)}
                    className="flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 bg-white border border-blue-100 text-blue-600 text-xs font-medium rounded-full hover:bg-blue-50 hover:border-blue-200 transition-all shadow-sm"
                  >
                    {s.icon} {s.label}
                  </button>
                ))}
              </div>
            )}

            {/* Input Area */}
            <div className="p-3 bg-white border-t border-gray-100">
              <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-full border border-gray-200 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-300 transition-all">
                <input
                  type="text"
                  placeholder="Ask for travel tips..."
                  className="flex-1 bg-transparent border-none focus:ring-0 text-sm px-2 outline-none text-gray-700"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  disabled={isLoading}
                />
                <button 
                  onClick={() => handleSendMessage()}
                  disabled={isLoading || !inputText.trim()}
                  className={`p-2 rounded-full text-white transition-all shadow-md ${
                    isLoading || !inputText.trim() 
                    ? 'bg-gray-300 shadow-none cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 hover:scale-105 active:scale-95'
                  }`}
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white p-4 rounded-full shadow-lg transition-all hover:scale-110 active:scale-95 flex items-center justify-center relative"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
        {!isOpen && (
          <span className="absolute top-0 right-0 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
        )}
      </button>
    </div>
  );
};

export default ChatBot;