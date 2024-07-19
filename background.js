// Constants for the Text-to-Speech (TTS) plugin
const TTS_PLUGIN = {
  LOG_PREFIX: '[TTS Plugin]',
  ERROR_PREFIX: '[TTS Plugin Error]',
  CONTEXT_MENU_ID: 'readSelectedText',
  CONTEXT_MENU_TITLE: 'Read Aloud',
  CONTEXT_MENU_PAUSE_ID: 'pauseResumeReading',
  CONTEXT_MENU_PAUSE_TITLE: 'Pause/Resume Reading',
  API_ENDPOINT: 'https://api.openai.com/v1/audio/speech',
  TTS_MODEL: 'tts-1',
  DEFAULT_VOICE: 'alloy'
};

// Utility functions for logging
const log = (message, ...args) => console.log(`${TTS_PLUGIN.LOG_PREFIX} ${message}`, ...args);
const logError = (message, ...args) => console.error(`${TTS_PLUGIN.ERROR_PREFIX} ${message}`, ...args);

// Display error message to user via content script
const showError = (tabId, message) => {
  logError('Showing error:', message);
  chrome.tabs.sendMessage(tabId, { action: 'showError', error: message });
};

// Create context menus for the extension
const createContextMenus = () => {
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

  chrome.contextMenus.create({
    id: TTS_PLUGIN.CONTEXT_MENU_PAUSE_ID,
    title: TTS_PLUGIN.CONTEXT_MENU_PAUSE_TITLE,
    contexts: ['page']
  }, () => {
    if (chrome.runtime.lastError) {
      logError('Error creating pause/resume context menu:', chrome.runtime.lastError);
    } else {
      log('Pause/resume context menu created successfully');
    }
  });
};

// Retrieve user settings from chrome.storage
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

// Fetch audio data from OpenAI API
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

// Send message to content script and handle potential errors
const sendMessageToContentScript = async (tabId, message) => {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        logError('Error sending message:', chrome.runtime.lastError);
        reject(new Error(chrome.runtime.lastError.message));
      } else if (response && response.success === false) {
        logError('Error response from content script:', response.error);
        reject(new Error(response.error));
      } else {
        log('Message sent successfully');
        resolve(response);
      }
    });
  });
};

// Retrieve selected text from content script
const getSelectedText = async (tabId) => {
  try {
    const response = await sendMessageToContentScript(tabId, { action: 'getSelectedText' });
    return response.text;
  } catch (error) {
    logError('Error getting selected text:', error);
    throw error;
  }
};

// Handle context menu clicks
const handleContextMenuClick = async (info, tab) => {
  log('Context menu clicked', info, tab);
  try {
    if (info.menuItemId === TTS_PLUGIN.CONTEXT_MENU_ID) {
      // Show loading indicator
      await sendMessageToContentScript(tab.id, { action: 'showLoading' });

      const selectedText = await getSelectedText(tab.id);
      if (selectedText) {
        const settings = await getSettings();
        if (settings.apiKey) {
          const audioData = await fetchAudioFromOpenAI(selectedText, settings.apiKey, settings.voice);
          await sendMessageToContentScript(tab.id, { action: 'playAudioData', audioData: Array.from(new Uint8Array(audioData)) });
        } else {
          throw new Error('API key not found. Please configure it in the settings.');
        }
      } else {
        throw new Error('No text selected');
      }
    } else if (info.menuItemId === TTS_PLUGIN.CONTEXT_MENU_PAUSE_ID) {
      await sendMessageToContentScript(tab.id, { action: 'togglePlayPause' });
    } else {
      throw new Error('Unknown menu item');
    }
  } catch (error) {
    logError('Error during processing:', error);
    // Hide loading indicator in case of error
    await sendMessageToContentScript(tab.id, { action: 'hideLoading' });
    showError(tab.id, `Error: ${error.message}`);
  }
};

// Initialize the extension
const init = () => {
  chrome.runtime.onInstalled.addListener(() => {
    log('Plugin installed or updated');
    createContextMenus();
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