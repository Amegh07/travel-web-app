import { useEffect, useState } from 'react';
import { generatePackingList } from '../services/geminiAPI';
import { CheckSquare, Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const PackingList = ({ destination, days, interests }) => {
  const [packingList, setPackingList] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchList = async () => {
      setLoading(true);
      try {
        const data = await generatePackingList(destination, days, interests);
        if (isMounted) {
          setPackingList(data);
        }
      } catch (err) {
        console.error("Packing List Failed", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (destination) {
      fetchList();
    }

    return () => { isMounted = false; };
  }, [destination, days, interests]);

  if (loading) {
    return (
      <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 text-center min-h-[200px] flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-emerald-400 w-8 h-8 mb-2" />
        <h3 className="text-lg font-bold text-white">AI Packing Guide</h3>
        <p className="text-white/50 text-xs">Analyzing trip requirements...</p>
      </div>
    );
  }

  if (!packingList || Object.keys(packingList).length === 0) {
    return (
      <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 text-center">
        <AlertCircle className="text-white/50 w-8 h-8 mx-auto mb-2" />
        <p className="text-white/50 text-sm">Could not load packing list.</p>
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10">
      <div className="flex items-center gap-2 mb-4">
        <div className="bg-emerald-500/20 p-2 rounded-lg">
          <CheckSquare className="text-emerald-400 w-5 h-5" />
        </div>
        <h3 className="text-lg font-bold text-white">AI Packing Guide</h3>
      </div>

      <div className="space-y-4">
        {Object.entries(packingList).map(([category, items], index) => (
          <motion.div 
            key={category}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-black/20 rounded-xl overflow-hidden"
          >
            <div className="px-4 py-2 bg-white/5 font-bold text-sm text-emerald-200 uppercase tracking-wider">
              {category}
            </div>
            <div className="p-3 grid grid-cols-2 gap-2">
              {Array.isArray(items) && items.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-white/80">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
                  {item}
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default PackingList;