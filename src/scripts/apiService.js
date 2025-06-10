class ApiService {
  /**
   * Sends a POST request to the specified endpoint
   * @param {string} url - The API endpoint URL
   * @param {Object} data - The data to send in the request body
   * @returns {Promise<Object>} The parsed JSON response
   */
  static async post(url, data) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  /**
   * Example method to send page data
   * @param {string} url - The current page URL
   * @param {string} title - The current page title
   * @returns {Promise<Object>} The API response
   */
  static async sendPageData(url, title) {
    const endpoint = 'https://api.example.com/collect'; // Replace with your actual API endpoint
    const data = {
      url,
      title,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    };

    return this.post(endpoint, data);
  }
}

export default ApiService;
