document.addEventListener('DOMContentLoaded', function() {
  const scrapeButton = document.getElementById('scrapeButton');
  const scrapeButtonText = document.getElementById('scrapeButtonText');
  const autoScrapeToggle = document.getElementById('autoScrapeToggle');
  const statusDiv = document.getElementById('status');
  let isScraping = false;
  let isAutoScraping = false;

  // Update status display
  function updateStatus(message, type = '') {
    statusDiv.textContent = message;
    // Remove all status classes
    statusDiv.className = 'status-message';
    // Add specific status class if provided
    if (type) {
      statusDiv.classList.add(`status-${type}`);
    }
  }


  // Toggle scraping state
  async function toggleScraping() {
    if (isScraping) return; // Prevent multiple clicks
    
    isScraping = true;
    scrapeButtonText.textContent = 'Scraping...';
    scrapeButton.disabled = true;
    
    try {
      updateStatus('Scraping page content...', 'sending');
      
      // Send message to background script to handle the scraping
      const response = await chrome.runtime.sendMessage({
        action: 'SCRAPE_CURRENT_PAGE'
      }).catch(error => {
        console.error('Message passing error:', error);
        throw new Error('Could not communicate with background script');
      });
      
      if (!response) {
        throw new Error('No response from background script');
      }
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      updateStatus('✅ Page scraped and sent successfully!', 'success');
    } catch (error) {
      console.error('Scraping error:', error);
      updateStatus(`❌ Error: ${error.message || 'Failed to scrape page'}`, 'error');
    } finally {
      isScraping = false;
      scrapeButtonText.textContent = 'Scrape This Page';
      scrapeButton.disabled = false;
    }
  }

  // Toggle auto-scraping
  async function toggleAutoScrape() {
    isAutoScraping = !isAutoScraping;
    autoScrapeToggle.checked = isAutoScraping;
    
    try {
      // Send message to background script to update auto-scraping state
      const response = await chrome.runtime.sendMessage({
        action: 'TOGGLE_AUTO_SCRAPE'
      });
      
      if (response && response.isAutoScraping !== undefined) {
        isAutoScraping = response.isAutoScraping;
        updateStatus(
          isAutoScraping ? 'Auto-scraping enabled' : 'Auto-scraping disabled',
          isAutoScraping ? 'success' : ''
        );
      }
    } catch (error) {
      console.error('Error toggling auto-scrape:', error);
      updateStatus('❌ Error toggling auto-scrape', 'error');
      isAutoScraping = !isAutoScraping; // Revert on error
      autoScrapeToggle.checked = isAutoScraping;
    }
  }

  // Initialize the popup
  async function init() {
    try {
      // Get current auto-scrape status
      const response = await chrome.runtime.sendMessage({
        action: 'GET_SCRAPE_STATUS'
      });
      
      if (response && response.isAutoScraping !== undefined) {
        isAutoScraping = response.isAutoScraping;
        autoScrapeToggle.checked = isAutoScraping;
      }
    } catch (error) {
      console.error('Error initializing popup:', error);
    }
  }

  // Event listeners
  scrapeButton.addEventListener('click', toggleScraping);
  autoScrapeToggle.addEventListener('change', toggleAutoScrape);
  
  // Initialize
  init();
});
