// Use the provided Render URL or fallback to same-origin for local testing
export const API_BASE_URL = import.meta.env.VITE_APP_URL || import.meta.env.VITE_API_URL || "";

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
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
          const titleMatch = errorText.match(/<title>(.*?)<\/title>/i);
          const title = titleMatch ? titleMatch[1] : "Unknown HTML Error";
          errorMessage = `The server returned an HTML error page: "${title}".`;
          errorDetails = "\nThis usually means the backend URL is incorrect, the server is down, or there is a proxy error.";
        } else if (errorText.length < 150) {
          errorMessage = errorText;
        }
      }
      throw new Error(`${errorMessage}${errorDetails}`);
    }

    if (!isJson) {
      throw new Error("The server returned a non-JSON response. Please check the backend configuration.");
    }

    return response.json();
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Failed to fetch') {
        throw new Error(`Connection Failed: Could not connect to ${url}. Please check your internet connection or backend status.`);
      }
      throw error;
    }
    throw new Error('An unknown error occurred during fetch');
  }
};
