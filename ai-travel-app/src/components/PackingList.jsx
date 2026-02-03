import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Sparkles, Loader2, ChevronDown } from 'lucide-react';
import { generatePackingList } from '../services/geminiAPI';

const PackingList = ({ destination, days, interests }) => {
  const [packingData, setPackingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkedItems, setCheckedItems] = useState({});
  const [expandedCategory, setExpandedCategory] = useState(null);

  useEffect(() => {
    const fetchList = async () => {
      if (!destination) return;
      setLoading(true);
      try {
        const rawData = await generatePackingList(destination, days, interests);
        
        // 🔧 DATA NORMALIZER (Fixes the "Raw JSON" bug)
        let cleanData = {};
        
        if (Array.isArray(rawData)) {
          // If AI returns an array like [{"category": "Tech", "items": [...]}]
          // We convert it to {"Tech": [...]}
          rawData.forEach(group => {
            if (group.category && Array.isArray(group.items)) {
              cleanData[group.category] = group.items;
            } else if (group.name && Array.isArray(group.list)) {
               cleanData[group.name] = group.list;
            }
          });
        } else if (typeof rawData === 'object' && rawData !== null) {
          // If it's already the correct format, just use it
          cleanData = rawData;
        }

        setPackingData(cleanData);
        
        // Open first category by default
        const keys = Object.keys(cleanData);
        if (keys.length > 0) setExpandedCategory(keys[0]);

      } catch (err) {
        console.error("Packing List Error", err);
      } finally {
        setLoading(false);
      }
    };

    fetchList();
  }, [destination, days, interests]);

  const toggleItem = (category, item) => {
    const key = `${category}-${item}`;
    setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // 🛡️ ITEM CLEANER (Removes weird objects from the list)
  const getCleanItemText = (item) => {
    if (typeof item === 'string') return item;
    if (typeof item === 'object' && item !== null) {
      return item.item || item.name || item.value || "Travel Essential";
    }
    return "Item";
  };

  return (
    <motion.section 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="backdrop-blur-xl bg-white/60 rounded-3xl p-8 border border-white/40 shadow-xl"
    >
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-2.5 rounded-xl text-white shadow-lg">
          <Sparkles size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">AI Packing Guide</h2>
          <p className="text-gray-600 text-sm">Smart essentials for {destination}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <Loader2 size={40} className="text-green-500 mb-4 animate-spin" />
          <p>Analyzing trip requirements...</p>
        </div>
      ) : packingData && Object.keys(packingData).length > 0 ? (
        <div className="space-y-3">
          {Object.entries(packingData).map(([category, items], idx) => {
            const safeItems = Array.isArray(items) ? items : []; 
            if (safeItems.length === 0) return null;

            return (
              <motion.div key={category} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}>
                <button
                  onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
                  className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-green-50/50 to-transparent rounded-xl hover:bg-green-100/30 transition-all group border border-white/40"
                >
                  <span className="font-bold text-gray-800 capitalize flex items-center gap-2">
                    {category.replace(/_/g, ' ')}
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{safeItems.length}</span>
                  </span>
                  <ChevronDown size={20} className={`text-green-600 transition-transform ${expandedCategory === category ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {expandedCategory === category && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div className="p-4 pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {safeItems.map((rawItem, i) => {
                          const itemText = getCleanItemText(rawItem);
                          const isChecked = checkedItems[`${category}-${itemText}`];
                          return (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              onClick={() => toggleItem(category, itemText)}
                              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-all ${isChecked ? 'bg-green-500 border-green-500 text-white' : 'bg-white/50 border-white/60 hover:bg-white text-gray-700'}`}
                            >
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isChecked ? 'border-white bg-white/20' : 'border-gray-300'}`}>
                                {isChecked && <Check size={12} className="text-white" />}
                              </div>
                              <span className={`text-sm font-medium ${isChecked ? 'line-through opacity-90' : ''}`}>{itemText}</span>
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-xl">
          <p>No packing info available right now.</p>
          <button onClick={() => window.location.reload()} className="text-blue-500 text-sm mt-2 hover:underline">Try Refreshing</button>
        </div>
      )}
    </motion.section>
  );
};

export default PackingList;