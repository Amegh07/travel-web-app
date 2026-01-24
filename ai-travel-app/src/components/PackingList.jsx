import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Briefcase, Loader2 } from 'lucide-react';
import { generatePackingList } from '../services/geminiAPI';

const PackingList = ({ destination, days, interests }) => {
  const [items, setItems] = useState({});
  const [loading, setLoading] = useState(true);
  const [checkedItems, setCheckedItems] = useState({});

  useEffect(() => {
    const fetchList = async () => {
      if (!destination) return;
      setLoading(true);
      // Default to 5 days if undefined
      const list = await generatePackingList(destination, days || 5, interests);
      setItems(list);
      setLoading(false);
    };

    fetchList();
  }, [destination, days, interests]);

  const toggleItem = (item) => {
    setCheckedItems(prev => ({ ...prev, [item]: !prev[item] }));
  };

  return (
    <section className="bg-white rounded-3xl p-8 border border-purple-100 shadow-sm mb-12">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-purple-600 p-2 rounded-xl text-white">
          <Briefcase size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">AI Packing Assistant</h2>
          <p className="text-gray-500 text-sm">Personalized checklist for your trip to {destination}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10 text-gray-400">
          <Loader2 size={30} className="animate-spin text-purple-500 mr-2" />
          Generating checklist...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {Object.entries(items).map(([category, list]) => (
            <div key={category}>
              <h3 className="font-bold text-purple-700 mb-3 border-b border-purple-100 pb-1">{category}</h3>
              <ul className="space-y-2">
                {Array.isArray(list) && list.map((item, idx) => (
                  <li 
                    key={idx} 
                    onClick={() => toggleItem(item)}
                    className={`flex items-center gap-3 cursor-pointer p-2 rounded-lg transition-all ${checkedItems[item] ? 'bg-green-50 text-green-700' : 'hover:bg-gray-50 text-gray-600'}`}
                  >
                    {checkedItems[item] ? <CheckCircle2 size={18} /> : <Circle size={18} className="text-gray-300" />}
                    <span className={checkedItems[item] ? 'line-through' : ''}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {Object.keys(items).length === 0 && (
             <p className="text-gray-500 col-span-2">Could not generate a list. Please check your connection.</p>
          )}
        </div>
      )}
    </section>
  );
};

export default PackingList;