// Constants
const TTS_PLUGIN = {
  LOG_PREFIX: '[TTS Plugin]',
  ERROR_PREFIX: '[TTS Plugin Error]',
  CONTEXT_MENU_ID: 'readSelectedText',
  CONTEXT_MENU_TITLE: 'Read Aloud',
  API_ENDPOINT: 'https://api.openai.com/v1/audio/speech',
  TTS_MODEL: 'tts-1',
  DEFAULT_VOICE: 'alloy'
};

// Utility functions
const log = (message, ...args) => console.log(`${TTS_PLUGIN.LOG_PREFIX} ${message}`, ...args);
const logError = (message, ...args) => console.error(`${TTS_PLUGIN.ERROR_PREFIX} ${message}`, ...args);

// Error handling
const showError = (tabId, message) => {
  logError('Showing error:', message);
  chrome.tabs.sendMessage(tabId, { action: 'showError', error: message });
};

// Context menu creation
const createContextMenu = () => {
  chrome.contextMenus.create({
    id: TTS_PLUGIN.CONTEXT_MENU_ID,
    title: TTS_PLUGIN.CONTEXT_MENU_TITLE,
    contexts: ['selection']
  }, () => {
    if (chrome.runtime.lastError) {
      logError('Error creating context menu:', chrome.runtime.lastError);
    } else {
      log('Context menu created successfully');
    }
  });
};

// Settings management
const getSettings = () => {
  return new Promise((resolve) => {
    chrome.storage.local.get(['apiKey', 'voice'], (result) => {
      resolve({
        apiKey: result.apiKey,
        voice: result.voice || TTS_PLUGIN.DEFAULT_VOICE
      });
    });
  });
};

// OpenAI API interaction
const fetchAudioFromOpenAI = async (text, apiKey, voice) => {
  log('Sending request to OpenAI API');
  try {
    const response = await fetch(TTS_PLUGIN.API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: TTS_PLUGIN.TTS_MODEL,
        input: text,
        voice: voice
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    log('Audio data received from OpenAI');
    return await response.arrayBuffer();
  } catch (error) {
    logError('Error fetching audio data:', error);
    throw error;
  }
};

// Content script communication
const sendAudioDataToContentScript = async (tabId, audioData) => {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, { 
      action: 'playAudioData', 
      audioData: Array.from(new Uint8Array(audioData))
    }, () => {
      if (chrome.runtime.lastError) {
        logError('Error sending audio data:', chrome.runtime.lastError);
        reject(chrome.runtime.lastError);
      } else {
        log('Audio data sent successfully');
        resolve();
      }
    });
  });
};

const getSelectedText = async (tabId) => {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, { action: 'getSelectedText' }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(`Error getting selected text: ${chrome.runtime.lastError.message}`));
      } else if (response && response.text) {
        log('Selected text received, length:', response.text.length);
        resolve(response.text);
      } else {
        resolve(null);
      }
    });
  });
};

// Main logic
const handleContextMenuClick = async (info, tab) => {
  log('Context menu clicked', info, tab);
  if (info.menuItemId === TTS_PLUGIN.CONTEXT_MENU_ID) {
    try {
      const selectedText = await getSelectedText(tab.id);
      if (selectedText) {
        const settings = await getSettings();
        if (settings.apiKey) {
          const audioData = await fetchAudioFromOpenAI(selectedText, settings.apiKey, settings.voice);
          await sendAudioDataToContentScript(tab.id, audioData);
        } else {
          showError(tab.id, 'API key not found. Please configure it in the settings.');
        }
      } else {
        showError(tab.id, 'No text selected');
      }
    } catch (error) {
      logError('Error during processing:', error);
      showError(tab.id, `Error: ${error.message}`);
    }
  }
};

// Initialization
const init = () => {
  chrome.runtime.onInstalled.addListener(() => {
    log('Plugin installed or updated');
    createContextMenu();
  });

  chrome.contextMenus.onClicked.addListener(handleContextMenuClick);

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'logError') {
      logError('Error from content script:', request.error);
    }
  });

  log('Background script initialized');
};

init();
