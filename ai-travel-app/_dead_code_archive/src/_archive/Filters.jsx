const Filters = ({ filters, setFilters }) => {
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilters(prev => ({
      ...prev,
      // If it's a checkbox use 'checked', otherwise use 'value'
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
      <h3 className="font-bold text-gray-700 mb-4">Filters</h3>
      
      {/* Cabin Class Dropdown */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-600 mb-2">Cabin Class</label>
        <select 
          name="cabin" 
          value={filters.cabin} 
          onChange={handleChange} 
          className="w-full border rounded p-2 text-sm bg-white"
        >
          <option value="ALL">All Classes</option>
          <option value="ECONOMY">Economy</option>
          <option value="BUSINESS">Business</option>
          <option value="FIRST">First Class</option>
        </select>
      </div>

      {/* Price Slider */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-600 mb-2">
            Max Price (INR): {filters.maxPrice}
        </label>
        <input 
          type="range" 
          name="maxPrice" 
          min="5000" 
          max="1000000" 
          step="5000" 
          value={filters.maxPrice} 
          onChange={handleChange} 
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" 
        />
      </div>
    </div>
  );
};

export default Filters;