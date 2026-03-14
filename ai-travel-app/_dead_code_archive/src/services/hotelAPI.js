export const fetchHotels = async (city, _checkInDate, _checkOutDate) => {
  // Simulate network delay (500ms)
  await new Promise(resolve => setTimeout(resolve, 500));

  // Return high-quality mock data
  // Using specific Unsplash IDs to ensure images always load correctly
  return [
    {
      id: 1,
      name: `Grand ${city} Resort`,
      rating: 4.9,
      price: "$350/night",
      image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80",
      description: "Experience world-class luxury and breathtaking views in the heart of the city.",
      amenities: ["Infinity Pool", "Spa", "Fine Dining", "Valet"],
      _isMock: true
    },
    {
      id: 2,
      name: `${city} Boutique Hotel`,
      rating: 4.7,
      price: "$220/night",
      image: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=800&q=80",
      description: "Stylish and modern accommodation perfect for urban explorers.",
      amenities: ["Rooftop Bar", "Co-working Space", "Gym", "Art Gallery"],
      _isMock: true
    },
    {
      id: 3,
      name: "The Heritage Inn",
      rating: 4.5,
      price: "$180/night",
      image: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80",
      description: "A blend of traditional charm and modern comfort.",
      amenities: ["Free Breakfast", "Garden", "Library", "Shuttle Service"],
      _isMock: true
    },
    {
      id: 4,
      name: "Urban Stay Suites",
      rating: 4.3,
      price: "$120/night",
      image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80",
      description: "Spacious suites with kitchenettes, ideal for longer stays.",
      amenities: ["Kitchenette", "Laundry", "24h Concierge", "Pet Friendly"],
      _isMock: true
    }
  ];
};