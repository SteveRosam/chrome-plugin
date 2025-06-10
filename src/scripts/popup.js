import ApiService from './apiService.js';

document.addEventListener('DOMContentLoaded', function() {
  const actionButton = document.getElementById('actionButton');
  const statusDiv = document.getElementById('status');

  function updateStatus(message, type = '') {
    statusDiv.textContent = message;
    // Remove all status classes
    statusDiv.className = 'status-message';
    // Add specific status class if provided
    if (type) {
      statusDiv.classList.add(`status-${type}`);
    }
  }

  async function sendData() {
    try {
      updateStatus('Sending data to server...', 'sending');
      
      // Get current tab info
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Send data to the API
      const response = await ApiService.sendPageData(tab.url, tab.title);
      
      updateStatus('✅ Data sent successfully!', 'success');
      console.log('API Response:', response);
    } catch (error) {
      console.error('Error:', error);
      updateStatus('❌ Error: ' + (error.message || 'Failed to send data'), 'error');
    }
  }

  actionButton.addEventListener('click', sendData);
});
