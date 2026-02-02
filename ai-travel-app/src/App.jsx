import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect, useState } from 'react';
import SearchPage from './pages/SearchPage';
import ResultsPage from './pages/ResultsPage';
import ErrorBoundary from './components/ErrorBoundary';
import { LoadingProvider } from './contexts/LoadingContext';
import { validateEnvironmentVariables, getEnvErrorMessage } from './utils/envValidator';
import { initDevTools, logDevInfo } from './utils/devTools';

const NotFound = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 p-4">
    <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
    <p className="text-xl text-gray-600 mb-8">Page not found</p>
    <a href="/" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold">
      Return Home
    </a>
  </div>
);

function App() {
  const [envError, setEnvError] = useState(null);

  useEffect(() => {
    // Initialize dev tools
    initDevTools();

    // Validate environment variables on app start
    const validation = validateEnvironmentVariables();
    if (!validation.isValid) {
      logDevInfo('Environment Validation Error', validation);
      // eslint-disable-next-line react-hooks/exhaustive-deps
      setEnvError(getEnvErrorMessage());
      console.error('Environment Validation Failed:', validation);
    } else {
      logDevInfo('App Initialized', { timestamp: new Date().toISOString() });
    }
  }, []);

  if (envError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full border border-orange-200">
          <div className="flex items-center justify-center w-14 h-14 bg-orange-100 rounded-full mx-auto mb-6">
            <span className="text-2xl">⚙️</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-4">Configuration Required</h1>
          <p className="text-gray-600 text-sm whitespace-pre-line font-mono text-center">{envError}</p>
          <p className="text-gray-500 text-xs mt-6 text-center">
            Contact your administrator if you believe this is an error.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <LoadingProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<SearchPage />} />
            <Route path="/results" element={<ResultsPage />} />
            <Route path="*" element={<div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 p-4"><h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1><p className="text-xl text-gray-600 mb-8">Page not found</p><a href="/" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold">Return Home</a></div>} />
          </Routes>
        </BrowserRouter>
      </LoadingProvider>
    </ErrorBoundary>
  );
}

export default App;