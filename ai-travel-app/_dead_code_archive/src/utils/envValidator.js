/**
 * Validates that all required environment variables are present
 * @throws {Error} If any required variables are missing
 */
export const validateEnvironmentVariables = () => {
  const requiredVars = [
    'VITE_AMADEUS_CLIENT_ID',
    'VITE_AMADEUS_CLIENT_SECRET',
    'VITE_GEMINI_API_KEY',
    'VITE_TICKETMASTER_API_KEY'
  ];

  const missingVars = requiredVars.filter(
    (varName) => !import.meta.env[varName]
  );

  if (missingVars.length > 0) {
    const message = `Missing required environment variables: ${missingVars.join(', ')}. Please check your .env.local file.`;
    console.error(message);
    return {
      isValid: false,
      missingVars,
      message
    };
  }

  return {
    isValid: true,
    missingVars: [],
    message: 'All environment variables are valid'
  };
};

/**
 * Check if a specific API service is available
 */
export const isServiceAvailable = (serviceName) => {
  const serviceVarMap = {
    amadeus: ['VITE_AMADEUS_CLIENT_ID', 'VITE_AMADEUS_CLIENT_SECRET'],
    gemini: ['VITE_GEMINI_API_KEY'],
    ticketmaster: ['VITE_TICKETMASTER_API_KEY']
  };

  if (!serviceVarMap[serviceName]) {
    return false;
  }

  return serviceVarMap[serviceName].every(
    (varName) => !!import.meta.env[varName]
  );
};

/**
 * Get a formatted error message for missing environment variables
 */
export const getEnvErrorMessage = () => {
  const validation = validateEnvironmentVariables();
  
  if (validation.isValid) {
    return null;
  }

  return `⚠️ Configuration Issue: ${validation.message}\n\nPlease ensure your .env.local file contains:\n${validation.missingVars.map(v => `- ${v}`).join('\n')}`;
};
