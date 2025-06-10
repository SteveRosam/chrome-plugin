/**
 * Scrapes the main content of the page
 * @returns {Object} An object containing the page content and metadata
 */
function scrapePageContent() {
  // Try to get the main content of the page
  const content = document.body.innerText || '';
  const title = document.title;
  const url = window.location.href;
  
  return {
    url,
    title,
    content: content.substring(0, 10000), // Limit content length
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent
  };
}

// Listen for messages from the popup or background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'SCRAPE_PAGE') {
    try {
      const pageData = scrapePageContent();
      sendResponse({ success: true, data: pageData });
    } catch (error) {
      console.error('Error scraping page:', error);
      sendResponse({ success: false, error: error.message });
    }
  }
  return true; // Required for async response
});
