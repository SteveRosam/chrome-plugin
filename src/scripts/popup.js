import WebsiteManager from './websiteManager.js';

document.addEventListener('DOMContentLoaded', async function() {
  // DOM Elements
  const scrapeButton = document.getElementById('scrapeButton');
  const scrapeButtonText = document.getElementById('scrapeButtonText');
  const autoScrapeToggle = document.getElementById('autoScrapeToggle');
  const statusElement = document.getElementById('status');
  const statusDiv = statusElement; // Alias for backward compatibility
  const websiteInput = document.getElementById('websiteInput');
  const addWebsiteBtn = document.getElementById('addWebsiteBtn');
  const websiteList = document.getElementById('websiteList');
  
  if (!statusElement) {
    console.error('Status element not found in the DOM');
    return;
  }

  // State
  let isScraping = false;
  let isAutoScraping = false;
  let websites = [];
  
  // Initialize auto-scrape toggle state
  function updateAutoScrapeState() {
    chrome.runtime.sendMessage({ action: 'GET_STATUS' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error getting status:', chrome.runtime.lastError);
        return;
      }
      isAutoScraping = response.isAutoScraping || false;
      autoScrapeToggle.checked = isAutoScraping;
    });
  }
  
  // Initialize UI
  updateAutoScrapeState();
  loadWebsites();
  
  // Toggle auto-scraping
  autoScrapeToggle.addEventListener('change', (e) => {
    chrome.runtime.sendMessage(
      { action: 'TOGGLE_AUTO_SCRAPE', enabled: e.target.checked },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error toggling auto-scrape:', chrome.runtime.lastError);
          updateStatus('❌ Error updating auto-scrape setting', 'error');
          return;
        }
        isAutoScraping = response.isAutoScraping;
        updateStatus(
          isAutoScraping ? '✅ Auto-scraping enabled' : 'Auto-scraping disabled',
          isAutoScraping ? 'success' : ''
        );
      }
    );
  });

  // Load websites on popup open
  async function loadWebsites() {
    try {
      websites = await WebsiteManager.getWebsites();
      renderWebsites();
    } catch (error) {
      console.error('Error loading websites:', error);
      updateStatus('❌ Error loading website list', 'error');
    }
  }

  // Render websites list
  function renderWebsites() {
    websiteList.innerHTML = '';
    
    if (websites.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'no-websites';
      emptyMsg.textContent = 'No websites added yet';
      websiteList.appendChild(emptyMsg);
      return;
    }

    websites.forEach((site, index) => {
      const item = document.createElement('div');
      item.className = 'website-item';
      
      const toggleId = `toggle-${index}`;
      item.innerHTML = `
        <div class="url" title="${site.url}">${site.url}</div>
        <label class="toggle">
          <input type="checkbox" ${site.enabled ? 'checked' : ''} id="${toggleId}">
          <span class="toggle-slider"></span>
        </label>
        <button class="remove-btn" data-url="${site.url}" title="Remove">×</button>
      `;
      
      // Toggle website enabled state
      const toggle = item.querySelector(`#${toggleId}`);
      toggle.addEventListener('change', async () => {
        try {
          await WebsiteManager.setWebsiteEnabled(site.url, toggle.checked);
          updateStatus(
            toggle.checked 
              ? `✅ Auto-scraping enabled for ${site.url}`
              : `Auto-scraping disabled for ${site.url}`,
            toggle.checked ? 'success' : ''
          );
          await loadWebsites(); // Refresh the list
        } catch (error) {
          console.error('Error toggling website:', error);
          updateStatus(`❌ Error updating website: ${error.message}`, 'error');
          toggle.checked = !toggle.checked; // Revert the toggle on error
        }
      });
      
      // Remove website
      const removeBtn = item.querySelector('.remove-btn');
      removeBtn.addEventListener('click', async () => {
        if (confirm(`Remove ${site.url} from auto-scrape list?`)) {
          try {
            await WebsiteManager.removeWebsite(site.url);
            updateStatus(`✅ Removed ${site.url} from auto-scrape list`, 'success');
            await loadWebsites(); // Refresh the list
          } catch (error) {
            console.error('Error removing website:', error);
            updateStatus(`❌ Error removing website: ${error.message}`, 'error');
          }
        }
      });
      
      websiteList.appendChild(item);
    });
  }
  
  // Add new website
  async function addWebsite() {
    let url = websiteInput.value.trim();
    if (!url) return;
    
    // Add https:// if no protocol is specified
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    // Basic URL validation
    try {
      new URL(url); // This will throw for invalid URLs
    } catch (e) {
      updateStatus('❌ Please enter a valid URL', 'error');
      return;
    }
    
    try {
      await WebsiteManager.addWebsite(url);
      websiteInput.value = '';
      await loadWebsites();
      updateStatus(`✅ Added ${url} to auto-scrape list`, 'success');
      
      // Scroll to the bottom to show the newly added website
      websiteList.scrollTop = websiteList.scrollHeight;
    } catch (error) {
      console.error('Error adding website:', error);
      updateStatus(
        error.message.includes('already exists')
          ? `ℹ️ ${url} is already in the list`
          : `❌ Error: ${error.message}`,
        'error'
      );
    }
  }
  
  // Handle scrape button click
  scrapeButton.addEventListener('click', async () => {
    // Get fresh references to elements in case the popup was recreated
    const currentScrapeButton = document.getElementById('scrapeButton');
    const currentScrapeButtonText = document.getElementById('scrapeButtonText');
    
    if (!currentScrapeButton || !currentScrapeButtonText) {
      console.error('Required elements not found in the DOM');
      return;
    }
    
    if (isScraping) return; // Prevent multiple clicks
    
    isScraping = true;
    currentScrapeButtonText.textContent = 'Scraping...';
    currentScrapeButton.disabled = true;
    
    // Store the current timestamp to handle async responses
    const requestTime = Date.now();
    
    try {
      updateStatus('Scraping page content...', 'sending');
      
      // Send message to background script to handle the scraping
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { 
            action: 'SCRAPE_CURRENT_PAGE',
            requestTime: requestTime
          },
          (response) => {
            // Check if the popup is still open and this is the most recent request
            const currentStatusElement = document.getElementById('status');
            if (!currentStatusElement) {
              console.log('Popup closed, ignoring response');
              return resolve({ canceled: true });
            }
            
            if (chrome.runtime.lastError) {
              console.error('Error scraping page:', chrome.runtime.lastError);
              resolve({ error: chrome.runtime.lastError });
            } else {
              console.log('Page scraped successfully:', response);
              resolve(response || {});
            }
          }
        );
      });
      
      // Check if the popup is still open
      if (!document.getElementById('status')) {
        console.log('Popup closed, not updating UI');
        return;
      }
      
      if (response.canceled) {
        return; // Popup was closed during the request
      }
      
      if (!response) {
        throw new Error('No response from background script');
      }
      
      if (response.error) {
        throw new Error(response.error.message || 'Unknown error occurred');
      }
      
      updateStatus('✅ Page scraped and sent successfully!', 'success');
    } catch (error) {
      console.error('Scraping error:', error);
      // Only update status if popup is still open
      if (document.getElementById('status')) {
        updateStatus(
          `❌ Error: ${error.message || 'Failed to scrape page'}`,
          'error'
        );
      }
    } finally {
      // Only update UI if popup is still open
      const statusElement = document.getElementById('status');
      if (statusElement) {
        isScraping = false;
        if (scrapeButtonText) scrapeButtonText.textContent = 'Scrape This Page';
        if (scrapeButton) scrapeButton.disabled = false;
      }
    }
  });
  
  // Handle add website button click
  addWebsiteBtn.addEventListener('click', addWebsite);
  
  // Allow adding website with Enter key
  websiteInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addWebsite();
  });
  
  // Update status display
  function updateStatus(message, type = '') {
    // Try to get a fresh reference to the status element
    const currentStatusElement = document.getElementById('status');
    
    if (!currentStatusElement) {
      console.error('Status element not found when trying to update status:', message);
      return;
    }
    
    try {
      // Update the status element
      currentStatusElement.textContent = message;
      currentStatusElement.className = 'status-message';
      
      // Add type class if provided
      if (type) {
        currentStatusElement.classList.add(type);
      }
      
      // Log the status update for debugging
      console.log(`Status Update [${type || 'info'}]:`, message);
      
      // Ensure the status is visible
      currentStatusElement.style.display = 'block';
      
      // Auto-hide success messages after 3 seconds
      if (type === 'success') {
        setTimeout(() => {
          if (currentStatusElement && currentStatusElement.textContent === message) {
            currentStatusElement.textContent = '';
            currentStatusElement.className = 'status-message';
          }
        }, 3000);
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  }
  
  // Update status display
  function updateStatus(message, type = '') {
    statusElement.textContent = message;
    // Remove all status classes
    statusElement.className = 'status-message';
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
