import ApiService from './apiService.js';
import WebsiteManager from './websiteManager.js';

// Track if auto-scraping is enabled
let isAutoScraping = false;

// Load the saved auto-scrape state on startup
function loadAutoScrapeState() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['autoScrapeEnabled'], function(result) {
      isAutoScraping = result.autoScrapeEnabled || false;
      updateExtensionState();
      resolve();
    });
  });
}

// Update extension icon and title based on state
function updateExtensionState() {
  const iconPath = isAutoScraping 
    ? { path: {
        '16': '/src/icons/icon16-active.png',
        '32': '/src/icons/icon32-active.png',
        '48': '/src/icons/icon48-active.png',
        '128': '/src/icons/icon128-active.png'
      }} 
    : { path: {
        '16': '/src/icons/icon16.png',
        '32': '/src/icons/icon32.png',
        '48': '/src/icons/icon48.png',
        '128': '/src/icons/icon128.png'
      }};
  
  const title = isAutoScraping ? 'Auto-scraping enabled' : 'Auto-scraping disabled';
  
  // Set the icon
  chrome.action.setIcon(iconPath);
  chrome.action.setTitle({ title });
  
  // Update badge to show status
  chrome.action.setBadgeText({
    text: isAutoScraping ? 'ON' : '',
  });
  
  chrome.action.setBadgeBackgroundColor({
    color: isAutoScraping ? '#4CAF50' : '#9E9E9E',
  });
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const handleResponse = (response) => {
    if (chrome.runtime.lastError) {
      console.error('Error in message handler:', chrome.runtime.lastError);
      sendResponse({ error: chrome.runtime.lastError });
    } else {
      sendResponse(response);
    }
  };

  if (request.action === 'TOGGLE_AUTO_SCRAPE') {
    isAutoScraping = request.enabled;
    chrome.storage.sync.set({ autoScrapeEnabled: isAutoScraping });
    updateExtensionState();
    handleResponse({ success: true, isAutoScraping });
  } 
  else if (request.action === 'GET_STATUS') {
    handleResponse({ isAutoScraping });
  } 
  else if (request.action === 'SCRAPE_CURRENT_PAGE') {
    const tabId = sender?.tab?.id;
    if (tabId) {
      scrapeAndSendData(tabId)
        .then(result => handleResponse(result))
        .catch(error => handleResponse({ success: false, error: error.message }));
      return true; // Keep message channel open for async response
    } else {
      // Fallback to active tab if sender.tab is not available
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          scrapeAndSendData(tabs[0].id)
            .then(result => handleResponse(result))
            .catch(error => handleResponse({ success: false, error: error.message }));
        } else {
          handleResponse({ success: false, error: 'No active tab found' });
        }
      });
      return true; // Keep message channel open for async response
    }
  }
  
  return false; // Not handling this message
});

// Initialize on extension load
chrome.runtime.onStartup.addListener(loadAutoScrapeState);
chrome.runtime.onInstalled.addListener(loadAutoScrapeState);

// Listen for tab updates to detect page navigation
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active && tab.url) {
    // Check if auto-scraping is enabled and the website is in our list
    const shouldScrape = isAutoScraping && await WebsiteManager.shouldAutoScrape(tab.url);
    
    if (shouldScrape) {
      console.log(`Auto-scraping: ${tab.url}`);
      // Small delay to ensure page is fully loaded
      setTimeout(() => scrapeAndSendData(tabId), 1000);
    }
  }
});

/**
 * Scrapes the current tab and sends data to the API
 * @param {number} tabId - The ID of the tab to scrape
 * @returns {Promise<{success: boolean, error?: string}>} The result of the operation
 */
async function scrapeAndSendData(tabId) {
  try {

    
    // Check if the tab is still valid
    const tab = await chrome.tabs.get(tabId).catch(() => null);
    if (!tab) {
      console.error('Tab not found or no longer exists');
      return { success: false, error: 'Tab not found' };
    }

    // Skip chrome:// and other restricted URLs
    if (tab.url.startsWith('chrome://') || 
        tab.url.startsWith('chrome-extension://') || 
        tab.url.startsWith('edge://') ||
        tab.url.startsWith('about:')) {
      console.log('Skipping Chrome/internal page:', tab.url);
      return { success: false, error: 'Cannot scrape Chrome internal pages' };
    }

    // Check if the tab is still valid
    console.log('Scraping tab:', tabId);
   
console.log('Tab found:', tab);
    // Execute content script in the current tab
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      function: scrapePageContent
    }).catch(error => {
      console.error('Error executing script:', error);
      throw new Error('Failed to execute content script');
    });
console.log('Result:', result);
    if (!result || !result.result) {
      throw new Error('No content was scraped from the page');
    }
console.log('Result:', result);
    console.log('Scraped page data:', {
      url: result.result.url,
      title: result.result.title,
      contentLength: result.result.content?.length || 0
    });

    // Send the data to the API
    await ApiService.sendPageData(result.result);
    console.log('Page data sent successfully:', result.result.url);
    
    return { success: true };
  } catch (error) {
    console.error('Error in scrapeAndSendData:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to scrape and send data' 
    };
  }
}

// This function is stringified and sent to the content script context
function scrapePageContent() {
  return {
    url: window.location.href,
    title: document.title,
    content: document.body.innerText.substring(0, 10000),
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent
  }
  // return {
  //   url: window.location.href,
  //   title: document.title,
  //   content: document.body.innerText.substring(0, 10000),
  //   timestamp: new Date().toISOString(),
  //   userAgent: navigator.userAgent
  // };
}
