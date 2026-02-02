import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, Briefcase, Loader2, ChevronDown } from 'lucide-react';
import { generatePackingList } from '../services/geminiAPI';

const PackingList = ({ destination, days, interests }) => {
  const [items, setItems] = useState({});
  const [loading, setLoading] = useState(true);
  const [checkedItems, setCheckedItems] = useState({});
  const [expandedCategories, setExpandedCategories] = useState({});

  useEffect(() => {
    const fetchList = async () => {
      if (!destination) return;
      setLoading(true);
      // Default to 5 days if undefined
      const list = await generatePackingList(destination, days || 5, interests);
      setItems(list);
      // Expand all categories by default
      const initialExpanded = Object.keys(list).reduce((acc, cat) => ({ ...acc, [cat]: true }), {});
      setExpandedCategories(initialExpanded);
      setLoading(false);
    };

    fetchList();
  }, [destination, days, interests]);

  const toggleItem = (item) => {
    setCheckedItems(prev => ({ ...prev, [item]: !prev[item] }));
  };

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  return (
    <motion.section 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="backdrop-blur-xl bg-white/60 rounded-3xl p-6 border border-white/40 shadow-xl"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-gradient-to-br from-purple-600 to-purple-500 p-2.5 rounded-xl text-white shadow-lg">
          <Briefcase size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">AI Packing Assistant</h2>
          <p className="text-gray-600 text-sm">Personalized checklist for {destination}</p>
        </div>
      </div>

      {loading ? (
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity }}
          className="flex items-center justify-center py-10 text-gray-400"
        >
          <Loader2 size={30} className="text-purple-500" />
          <span className="ml-3 font-medium">Generating checklist...</span>
        </motion.div>
      ) : Object.keys(items).length > 0 ? (
        <div className="space-y-3">
          {Object.entries(items).map(([category, list], catIdx) => (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: catIdx * 0.05 }}
            >
              <motion.button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-transparent rounded-xl hover:bg-purple-100/50 transition-all group"
                whileHover={{ x: 4 }}
              >
                <h3 className="font-bold text-purple-700 text-left">{category}</h3>
                <motion.div
                  animate={{ rotate: expandedCategories[category] ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ChevronDown size={20} className="text-purple-600" />
                </motion.div>
              </motion.button>

              <AnimatePresence>
                {expandedCategories[category] && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="pl-3 pr-3 pb-3 pt-2 space-y-2">
                      {Array.isArray(list) && list.map((item, idx) => (
                        <motion.button
                          key={idx}
                          onClick={() => toggleItem(item)}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          whileHover={{ x: 4 }}
                          className={`flex items-center gap-3 w-full p-2 rounded-lg transition-all ${
                            checkedItems[item] 
                              ? 'bg-green-50 text-green-700' 
                              : 'hover:bg-purple-50/50 text-gray-700'
                          }`}
                        >
                          <motion.div
                            initial={false}
                            animate={{ scale: checkedItems[item] ? 1.1 : 1 }}
                          >
                            {checkedItems[item] ? (
                              <CheckCircle2 size={18} className="text-green-600" />
                            ) : (
                              <Circle size={18} className="text-gray-300" />
                            )}
                          </motion.div>
                          <span className={checkedItems[item] ? 'line-through text-green-600' : ''}>
                            {item}
                          </span>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-center py-6">Could not generate a list. Please check your connection.</p>
      )}
    </motion.section>
  );
};

export default PackingList;