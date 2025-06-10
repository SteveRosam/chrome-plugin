document.addEventListener('DOMContentLoaded', function() {
  const actionButton = document.getElementById('actionButton');
  const statusDiv = document.getElementById('status');

  actionButton.addEventListener('click', function() {
    statusDiv.textContent = 'Button clicked!';
    statusDiv.style.color = '#4CAF50';
    
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const activeTab = tabs[0];
      console.log('Current tab:', activeTab.url);
    });
  });
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log('Message received:', request);
  // Handle the message here
});
