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
let source = null;
let startTime = 0;
let pausedAt = 0;
let isPlaying = false;
let audioBuffer = null;

const initAudioContext = async () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
};

// UI elements
let progressContainer = null;
let progressBar = null;
let pauseButton = null;
let progressInterval = null;

const createUIElements = () => {
  progressContainer = document.createElement('div');
  progressContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 30px;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 10001;
    display: flex;
    align-items: center;
  `;

  const progressBarContainer = document.createElement('div');
  progressBarContainer.style.cssText = `
    flex-grow: 1;
    height: 5px;
    background-color: rgba(255, 255, 255, 0.3);
    margin-left: 10px;
    cursor: pointer;
  `;

  progressBar = document.createElement('div');
  progressBar.style.cssText = `
    height: 100%;
    width: 0%;
    background-color: rgba(76, 175, 80, 0.7);
    transition: width 0.3s ease-out;
  `;

  progressBarContainer.appendChild(progressBar);
  progressBarContainer.addEventListener('click', handleProgressBarClick);

  const createButton = (text, onClick) => {
    const button = document.createElement('button');
    button.textContent = text;
    button.style.cssText = `
      background: none;
      border: none;
      color: white;
      font-size: 20px;
      cursor: pointer;
      padding: 0 10px;
      opacity: 0.7;
      transition: opacity 0.3s;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    button.addEventListener('click', onClick);
    button.addEventListener('mouseover', () => button.style.opacity = '1');
    button.addEventListener('mouseout', () => button.style.opacity = '0.7');
    return button;
  };

  const skipBackButton = createButton('⏪', () => skipAudio(-5));
  const skipForwardButton = createButton('⏩', () => skipAudio(5));
  pauseButton = createButton('❚❚', togglePlayPause);

  progressContainer.appendChild(progressBarContainer);
  progressContainer.appendChild(skipBackButton);
  progressContainer.appendChild(pauseButton);
  progressContainer.appendChild(skipForwardButton);
  document.body.appendChild(progressContainer);
};

const updateProgressBar = (progress) => {
  if (!progressBar) {
    createUIElements();
  }
  progressBar.style.width = `${progress}%`;
};

const updatePauseButton = () => {
  if (pauseButton) {
    pauseButton.textContent = isPlaying ? '❚❚' : '▶';
  }
};

const removeUIElements = () => {
  if (progressContainer) {
    progressContainer.remove();
    progressContainer = null;
    progressBar = null;
    pauseButton = null;
  }
};

const handleProgressBarClick = (event) => {
  if (!audioBuffer) return;

  const progressBarContainer = event.currentTarget;
  const clickPosition = event.offsetX / progressBarContainer.offsetWidth;
  const newTime = clickPosition * audioBuffer.duration;

  seekAudio(newTime);
};

// Audio playback
const decodeAudioData = async (audioData) => {
  const arrayBuffer = new Uint8Array(audioData).buffer;
  audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
};

const stopAudio = () => {
  if (source) {
    source.stop();
  }
  isPlaying = false;
  clearInterval(progressInterval);
};

const seekAudio = (newTime) => {
  if (!audioBuffer) return;

  stopAudio();
  pausedAt = Math.max(0, Math.min(newTime, audioBuffer.duration));
  playAudio();
};

const skipAudio = (seconds) => {
  if (!audioBuffer || !isPlaying) return;
  
  const currentTime = pausedAt + (audioContext.currentTime - startTime);
  const newTime = Math.max(0, Math.min(currentTime + seconds, audioBuffer.duration));
  
  seekAudio(newTime);
};

const playAudio = () => {
  if (!audioBuffer) return;

  source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioContext.destination);
  
  startTime = audioContext.currentTime;
  source.start(0, pausedAt);
  isPlaying = true;

  updateProgress();
  updatePauseButton();
};

const pauseAudio = () => {
  if (!isPlaying) return;

  source.stop();
  pausedAt += audioContext.currentTime - startTime;
  isPlaying = false;

  clearInterval(progressInterval);
  updatePauseButton();
};

const updateProgress = () => {
  clearInterval(progressInterval);
  progressInterval = setInterval(() => {
    const currentTime = pausedAt + (audioContext.currentTime - startTime);
    const progress = (currentTime / audioBuffer.duration) * 100;
    updateProgressBar(progress);
    if (currentTime >= audioBuffer.duration) {
      stopAudio();
      removeUIElements();
    }
  }, 100);
};

const togglePlayPause = async () => {
  await initAudioContext();
  
  if (isPlaying) {
    pauseAudio();
  } else {
    playAudio();
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
      top: 40px;
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
const handleMessage = async (request, sender, sendResponse) => {
  log('Message received:', request);
  try {
    switch (request.action) {
      case 'getSelectedText':
        const selectedText = window.getSelection().toString().trim(); 
        log('Selected text:', selectedText);
        sendResponse({text: selectedText});
        break;
      case 'playAudioData':
        await initAudioContext();
        await decodeAudioData(request.audioData);
        await togglePlayPause();
        sendResponse({success: true});
        break;
      case 'togglePlayPause':
        await togglePlayPause();
        sendResponse({success: true, isPlaying: isPlaying});
        break;
      case 'showError':
        showError(request.error);
        sendResponse({success: true});
        break;
      default:
        throw new Error('Unknown action: ' + request.action);
    }
  } catch (error) {
    logError('Error handling message:', error);
    sendResponse({success: false, error: error.message});
  }
};

// Initialization
const init = () => {
  log('Content script loaded');
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    try {
      handleMessage(request, sender, sendResponse);
    } catch (error) {
      logError('Unexpected error in message listener:', error);
      sendResponse({success: false, error: 'Unexpected error: ' + error.message});
    }
    return true;
  });
};

init();
