import { createContext, useState, useContext } from 'react';
import { Loader } from 'lucide-react';

const LoadingContext = createContext();

export const LoadingProvider = ({ children }) => {
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  const showLoading = (message = 'Loading...') => {
    setLoadingMessage(message);
    setIsGlobalLoading(true);
  };

  const hideLoading = () => {
    setIsGlobalLoading(false);
    setLoadingMessage('');
  };

  return (
    <LoadingContext.Provider value={{ showLoading, hideLoading, isGlobalLoading, loadingMessage }}>
      {children}
      {isGlobalLoading && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4 max-w-sm">
            <Loader className="w-12 h-12 text-blue-600 animate-spin" />
            <p className="text-lg font-semibold text-gray-800">{loadingMessage}</p>
          </div>
        </div>
      )}
    </LoadingContext.Provider>
  );
};

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within LoadingProvider');
  }
  return context;
};
