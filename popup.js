document.addEventListener('DOMContentLoaded', function() {
  const saveButton = document.getElementById('saveKey');
  const apiKeyInput = document.getElementById('apiKey');
  const statusDiv = document.getElementById('status');

  // Lade gespeicherten API-Schlüssel
  chrome.storage.local.get(['apiKey'], function(result) {
      if (result.apiKey) {
          apiKeyInput.value = result.apiKey;
      }
  });

  saveButton.addEventListener('click', function() {
      const apiKey = apiKeyInput.value.trim();
      if (apiKey) {
          chrome.storage.local.set({apiKey: apiKey}, function() {
              if (chrome.runtime.lastError) {
                  showStatus('Fehler beim Speichern des API-Schlüssels', 'error');
              } else {
                  showStatus('API-Schlüssel erfolgreich gespeichert', 'success');
              }
          });
      } else {
          showStatus('Bitte geben Sie einen API-Schlüssel ein', 'error');
      }
  });

  function showStatus(message, type) {
      statusDiv.textContent = message;
      statusDiv.className = 'status ' + type;
      statusDiv.style.display = 'block';
      setTimeout(() => {
          statusDiv.style.display = 'none';
      }, 3000);
  }
});