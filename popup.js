document.addEventListener('DOMContentLoaded', function() {
    const saveButton = document.getElementById('saveSettings');
    const apiKeyInput = document.getElementById('apiKey');
    const voiceSelect = document.getElementById('voiceSelect');
    const statusDiv = document.getElementById('status');
    const statusIcon = document.getElementById('statusIcon');
    const statusMessage = document.getElementById('statusMessage');

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

    // Show status message with animation
    const showStatus = (message, type) => {
        statusMessage.textContent = message;
        
        // Remove all previous classes
        statusDiv.className = 'mt-4 px-4 py-2 rounded text-center flex items-center justify-center transition-all duration-300 ease-in-out';
        
        if (type === 'success') {
            statusDiv.classList.add('bg-green-100', 'text-green-800');
            setStatusIcon('success');
        } else {
            statusDiv.classList.add('bg-red-100', 'text-red-800');
            setStatusIcon('error');
        }

        statusDiv.classList.remove('hidden', 'opacity-0');

        // Trigger reflow to ensure transition works
        statusDiv.offsetHeight;

        setTimeout(() => {
            statusDiv.classList.add('opacity-0');
            setTimeout(() => {
                statusDiv.classList.add('hidden');
            }, 300);
        }, 1500);
    };

    // Set status icon
    const setStatusIcon = (type) => {
        statusIcon.textContent = type === 'success' ? '✓' : '⚠';
    };

    // Event listeners
    saveButton.addEventListener('click', saveSettings);

    // Initialize
    loadSettings();
});