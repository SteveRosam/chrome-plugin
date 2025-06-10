class WebsiteManager {
  static STORAGE_KEY = 'autoScrapeWebsites';

  /**
   * Get all websites from storage
   * @returns {Promise<Array<{url: string, enabled: boolean}>>}
   */
  static async getWebsites() {
    const result = await chrome.storage.sync.get({ [this.STORAGE_KEY]: [] });
    return result[this.STORAGE_KEY];
  }

  /**
   * Add a new website to the list
   * @param {string} url - The URL to add
   * @returns {Promise<void>}
   */
  static async addWebsite(url) {
    const websites = await this.getWebsites();
    const normalizedUrl = this.normalizeUrl(url);
    
    // Check if website already exists
    if (!websites.some(site => this.normalizeUrl(site.url) === normalizedUrl)) {
      websites.push({ url: normalizedUrl, enabled: true });
      await chrome.storage.sync.set({ [this.STORAGE_KEY]: websites });
    }
  }

  /**
   * Remove a website from the list
   * @param {string} url - The URL to remove
   * @returns {Promise<void>}
   */
  static async removeWebsite(url) {
    const websites = await this.getWebsites();
    const normalizedUrl = this.normalizeUrl(url);
    const updated = websites.filter(site => this.normalizeUrl(site.url) !== normalizedUrl);
    await chrome.storage.sync.set({ [this.STORAGE_KEY]: updated });
  }

  /**
   * Toggle a website's enabled state
   * @param {string} url - The URL to toggle
   * @param {boolean} enabled - New enabled state
   * @returns {Promise<void>}
   */
  static async setWebsiteEnabled(url, enabled) {
    const websites = await this.getWebsites();
    const normalizedUrl = this.normalizeUrl(url);
    const updated = websites.map(site => 
      this.normalizeUrl(site.url) === normalizedUrl 
        ? { ...site, enabled } 
        : site
    );
    await chrome.storage.sync.set({ [this.STORAGE_KEY]: updated });
  }

  /**
   * Check if the current URL matches any enabled website pattern
   * @param {string} currentUrl - The current page URL
   * @returns {Promise<boolean>}
   */
  static async shouldAutoScrape(currentUrl) {
    if (!currentUrl) return false;
    const websites = await this.getWebsites();
    const normalizedCurrent = this.normalizeUrl(currentUrl);
    
    return websites.some(site => 
      site.enabled && 
      (normalizedCurrent.startsWith(site.url) || 
       currentUrl.includes(site.url.replace(/^https?:\/\//, '')))
    );
  }

  /**
   * Normalize URL for comparison
   * @private
   */
  static normalizeUrl(url) {
    // Remove protocol, www, and trailing slashes for comparison
    return url
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/+$/, '')
      .toLowerCase();
  }
}

export default WebsiteManager;
