import ApiService from './apiService.js';

// Track if auto-scraping is enabled
let isAutoScraping = false;

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

  const getActiveTab = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      return tab;
    } catch (error) {
      console.error('Error getting active tab:', error);
      return null;
    }
  };

  (async () => {
    try {
      if (request.action === 'TOGGLE_AUTO_SCRAPE') {
        isAutoScraping = !isAutoScraping;
        const tab = await getActiveTab();
        if (tab && tab.id) {
          chrome.action.setBadgeText({
            text: isAutoScraping ? 'ON' : '',
            tabId: tab.id
          });
        }
        handleResponse({ isAutoScraping });
      } else if (request.action === 'GET_SCRAPE_STATUS') {
        handleResponse({ isAutoScraping });
      } else if (request.action === 'SCRAPE_CURRENT_PAGE') {
        const tab = sender.tab || await getActiveTab();
        if (tab && tab.id) {
          await scrapeAndSendData(tab.id);
          handleResponse({ success: true });
        } else {
          handleResponse({ error: 'No active tab found' });
        }
      }
    } catch (error) {
      console.error('Error in message handler:', error);
      handleResponse({ error: error.message });
    }
  })();

  return true; // Required for async response
});

// Listen for tab updates to detect page navigation
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && isAutoScraping && tab.active) {
    // Small delay to ensure page is fully loaded
    setTimeout(() => scrapeAndSendData(tabId), 1000);
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

    // Execute content script in the current tab
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      function: scrapePageContent
    }).catch(error => {
      console.error('Error executing script:', error);
      throw new Error('Failed to execute content script');
    });

    if (!result || !result.result) {
      throw new Error('No content was scraped from the page');
    }

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
  };
}
