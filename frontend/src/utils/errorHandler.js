// Frontend error handling utilities

export const getErrorMessage = (error) => {
  if (error?.response?.data?.error) {
    return error.response.data.error;
  }
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  if (error?.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

export const isNetworkError = (error) => {
  return !error.response || error.code === 'NETWORK_ERROR';
};

export const isAuthError = (error) => {
  return error?.response?.status === 401 || 
         error?.response?.status === 403 ||
         error?.code === 'auth/invalid-credential';
};

export const isValidationError = (error) => {
  return error?.response?.status === 400;
};

export const isRateLimitError = (error) => {
  return error?.response?.status === 429;
};

export const handleApiError = (error, context = '') => {
  console.error(`API Error ${context}:`, error);
  
  if (isNetworkError(error)) {
    return 'Network error. Please check your connection and try again.';
  }
  
  if (isAuthError(error)) {
    return 'Authentication failed. Please log in again.';
  }
  
  if (isRateLimitError(error)) {
    // More specific rate limit messages
    const errorMsg = error?.response?.data?.error;
    if (errorMsg?.includes('AI requests')) {
      return 'Sending messages too quickly. Please wait a moment before sending another message.';
    }
    return 'You\'re doing that too quickly. Please wait a moment and try again.';
  }
  
  if (isValidationError(error)) {
    const details = error?.response?.data?.details;
    if (details && Array.isArray(details)) {
      return details.join(', ');
    }
    return getErrorMessage(error);
  }
  
  return getErrorMessage(error);
};