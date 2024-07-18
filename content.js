// Constants
const TTS_CONTENT = {
  LOG_PREFIX: '[TTS Plugin Content]',
  ERROR_PREFIX: '[TTS Plugin Content Error]',
};

// Utility functions
const log = (message, ...args) => console.log(`${TTS_CONTENT.LOG_PREFIX} ${message}`, ...args);
const logError = (message, ...args) => {
  console.error(`${TTS_CONTENT.ERROR_PREFIX} ${message}`, ...args);
  chrome.runtime.sendMessage({action: "logError", error: message});
};

// Audio context management
let audioContext = null;

const initAudioContext = async () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
};

// Audio playback
const playAudioData = async (audioData) => {
  await initAudioContext();
  
  try {
    const arrayBuffer = new Uint8Array(audioData).buffer;
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.start(0);
    
    return new Promise(resolve => {
      source.onended = resolve;
    });
  } catch (error) {
    logError('Error playing audio data:', error);
    showError("Error playing audio: " + error.message);
  }
};

// Error display
const showError = (message) => {
  logError('Error:', message);
  let errorDiv = document.getElementById('tts-error-message');
  if (!errorDiv) {
    errorDiv = document.createElement('div');
    errorDiv.id = 'tts-error-message';
    errorDiv.style.cssText = `
      position: fixed;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      background-color: #ff4444;
      color: white;
      padding: 10px;
      border-radius: 5px;
      z-index: 10000;
    `;
    document.body.appendChild(errorDiv);
  }
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
  setTimeout(() => {
    errorDiv.style.display = 'none';
  }, 5000);
};

// Message handling
const handleMessage = (request, sender, sendResponse) => {
  log('Message received:', request);
  switch (request.action) {
    case 'getSelectedText':
      const selectedText = window.getSelection().toString().trim();
      log('Selected text:', selectedText);
      sendResponse({text: selectedText});
      break;
    case 'playAudioData':
      // Start audio playback asynchronously, without waiting for a response
      playAudioData(request.audioData).catch(error => {
        logError('Error playing audio data:', error);
        showError("Error playing audio: " + error.message);
      });
      // Send an immediate response
      sendResponse({success: true});
      break;
    case 'showError':
      showError(request.error);
      sendResponse({success: true});
      break;
    default:
      logError('Unknown action:', request.action);
      sendResponse({error: 'Unknown action'});
  }
  // Important: Return true to indicate that sendResponse will be called asynchronously
  return true;
};

// Initialization
const init = () => {
  log('Content script loaded');
  chrome.runtime.onMessage.addListener(handleMessage);
};

init();
