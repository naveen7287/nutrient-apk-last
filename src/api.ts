export const API_BASE_URL = "https://nutriscan-backend-671q.onrender.com";

export const apiFetch = async (endpoint, options = {}) => {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const contentType = response.headers.get("content-type");
    const isJson = contentType && contentType.includes("application/json");

    if (!response.ok) {
      let errorMessage = `API Error: ${response.status}`;
      let errorDetails = '';

      if (isJson) {
        const errorJson = await response.json();
        errorMessage = errorJson.error || errorMessage;
        errorDetails = errorJson.details ? `\nDetails: ${errorJson.details}` : '';
      } else {
        const errorText = await response.text();
        if (errorText.includes("<!DOCTYPE") || errorText.includes("<html")) {
          errorMessage = "Server returned HTML instead of JSON (backend issue)";
        }
      }

      throw new Error(`${errorMessage}${errorDetails}`);
    }

    if (!isJson) {
      throw new Error("Server returned non-JSON response");
    }

    return response.json();

  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Failed to fetch') {
        throw new Error(`Cannot connect to backend: ${url}`);
      }
      throw error;
    }
    throw new Error('Unknown fetch error');
  }
};
