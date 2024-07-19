document.addEventListener('DOMContentLoaded', function() {
    const saveButton = document.getElementById('saveSettings');
    const apiKeyInput = document.getElementById('apiKey');
    const voiceSelect = document.getElementById('voiceSelect');
    const statusDiv = document.getElementById('status');

    // Load saved settings
    const loadSettings = () => {
        chrome.storage.local.get(['apiKey', 'voice'], function(result) {
            if (result.apiKey) {
                apiKeyInput.value = result.apiKey;
            }
            if (result.voice) {
                voiceSelect.value = result.voice;
            }
        });
    };

    // Save settings
    const saveSettings = () => {
        const apiKey = apiKeyInput.value.trim();
        const selectedVoice = voiceSelect.value;

        if (apiKey) {
            chrome.storage.local.set({apiKey: apiKey, voice: selectedVoice}, function() {
                if (chrome.runtime.lastError) {
                    showStatus('Error saving settings', 'error');
                } else {
                    showStatus('Settings saved successfully', 'success');
                }
            });
        } else {
            showStatus('Please enter an API key', 'error');
        }
    };

    // Show status message
    const showStatus = (message, type) => {
        const statusDiv = document.getElementById('status');
        statusDiv.textContent = message;
        statusDiv.classList.remove('hidden', 'bg-green-100', 'text-green-800', 'bg-red-100', 'text-red-800');
        statusDiv.classList.add(type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800');
        statusDiv.classList.remove('hidden');
        setTimeout(() => {
            statusDiv.classList.add('hidden');
        }, 3000);
    };

    // Event listeners
    saveButton.addEventListener('click', saveSettings);

    // Initialize
    loadSettings();
});
