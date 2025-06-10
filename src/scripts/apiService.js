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
   * Sends page data to the API
   * @param {Object} pageData - The page data to send
   * @param {string} pageData.url - The page URL
   * @param {string} pageData.title - The page title
   * @param {string} [pageData.content] - The page content (optional)
   * @param {string} [pageData.timestamp] - The timestamp (defaults to now)
   * @param {string} [pageData.userAgent] - The user agent (defaults to current)
   * @returns {Promise<Object>} The API response
   */
  static async sendPageData(pageData) {
    const endpoint = 'https://app-ide-68d34054-32af-45f1-8381-a87520e91f5a.demo.quix.io/collect'; // Quix service endpoint

    // Prepare the data with defaults
    const data = {
      url: pageData.url,
      title: pageData.title,
      content: pageData.content || '',
      timestamp: pageData.timestamp || new Date().toISOString(),
      userAgent: pageData.userAgent || navigator.userAgent
    };
    console.log(data);
    return this.post(endpoint, data);
  }
}

export default ApiService;
