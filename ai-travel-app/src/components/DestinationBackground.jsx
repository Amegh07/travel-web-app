// ai-travel-app/src/components/DestinationBackground.jsx
import { useState, useEffect } from 'react';

const DestinationBackground = ({ destination, children }) => {
  const [bgImage, setBgImage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchImage = async () => {
      if (!destination) return;
      
      setLoading(true);
      try {
        // Use Unsplash Source API for destination images
        // Format: https://source.unsplash.com/1600x900/?city,landscape,paris
        const searchTerm = destination.split('(')[0].trim().toLowerCase();
        
        // Try to get a real image from Unsplash
        const imageUrl = `https://source.unsplash.com/1920x1080/?${encodeURIComponent(searchTerm)},city,landscape,travel`;
        
        // Create an image object to preload
        const img = new Image();
        img.onload = () => {
          setBgImage(imageUrl);
          setLoading(false);
        };
        img.onerror = () => {
          // Fallback to a generic travel image
          setBgImage('https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1920&q=80');
          setLoading(false);
        };
        img.src = imageUrl;
        
      } catch (error) {
        console.error("Background image error:", error);
        setLoading(false);
      }
    };

    fetchImage();
  }, [destination]);

  return (
    <div className="relative min-h-screen">
      {/* Background Image Layer */}
      <div 
        className="fixed inset-0 z-0 transition-opacity duration-1000"
        style={{
          backgroundImage: bgImage ? `url("${bgImage}")` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: loading ? 0 : 0.4, // 40% opacity for readability
        }}
      />
      
      {/* Dark overlay gradient */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.9) 100%)'
        }}
      />
      
      {/* Loading state */}
      {loading && (
        <div className="fixed inset-0 z-0 bg-black flex items-center justify-center">
          <div className="text-gray-500 text-sm">Loading destination...</div>
        </div>
      )}
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default DestinationBackground;