document.addEventListener('DOMContentLoaded', function() {
    const saveButton = document.getElementById('saveSettings');
    const apiKeyInput = document.getElementById('apiKey');
    const voiceSelect = document.getElementById('voiceSelect');
    const statusDiv = document.getElementById('status');

    // Load saved settings
    chrome.storage.local.get(['apiKey', 'voice'], function(result) {
        if (result.apiKey) {
            apiKeyInput.value = result.apiKey;
        }
        if (result.voice) {
            voiceSelect.value = result.voice;
        }
    });

    saveButton.addEventListener('click', function() {
        const apiKey = apiKeyInput.value.trim();
        const selectedVoice = voiceSelect.value;

        if (apiKey) {
            chrome.storage.local.set({apiKey: apiKey, voice: selectedVoice}, function() {
                if (chrome.runtime.lastError) {
                    showStatus('Fehler beim Speichern der Einstellungen', 'error');
                } else {
                    showStatus('Einstellungen erfolgreich gespeichert', 'success');
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
