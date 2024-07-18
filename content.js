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

// Audio context and state management
let audioContext = null;
let source = null;
let startTime = 0;
let pausedAt = 0;
let isPlaying = false;
let audioBuffer = null;

// UI elements
let progressContainer = null;
let progressBar = null;
let pauseButton = null;
let progressInterval = null;

// Audio context initialization
const initAudioContext = async () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
};

let timeDisplay = null;

// UI creation and management
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
    margin-right: 10px;
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

  timeDisplay = document.createElement('div');
  timeDisplay.style.cssText = `
    color: white;
    font-size: 12px;
    margin-right: 10px;
    font-family: Arial, sans-serif;
  `;
  timeDisplay.textContent = '0:00 / 0:00';

  const createButton = (svgPath, onClick, tooltip) => {
    const button = document.createElement('button');
    button.innerHTML = svgPath;
    button.style.cssText = `
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      padding: 0 10px;
      opacity: 0.7;
      transition: opacity 0.3s;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    `;
    button.setAttribute('title', tooltip);
    button.addEventListener('click', onClick);
    button.addEventListener('mouseover', () => button.style.opacity = '1');
    button.addEventListener('mouseout', () => button.style.opacity = '0.7');
    return button;
  };

  const skipBackButton = createButton(
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="19 20 9 12 19 4 19 20"></polygon><line x1="5" y1="19" x2="5" y2="5"></line></svg>',
    () => skipAudio(-5),
    'Skip backward (5 seconds)'
  );
  
  const skipForwardButton = createButton(
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line></svg>',
    () => skipAudio(5),
    'Skip forward (5 seconds)'
  );
  
  pauseButton = createButton(
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>',
    togglePlayPause,
    'Play/Pause'
  );
  
  const downloadButton = createButton(
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>',
    downloadAudio,
    'Download audio'
  );
  
  const closeButton = createButton(
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
    closePlayer,
    'Close player'
  );

  progressContainer.appendChild(skipBackButton);
  progressContainer.appendChild(pauseButton);
  progressContainer.appendChild(skipForwardButton);
  progressContainer.appendChild(progressBarContainer);
  progressContainer.appendChild(timeDisplay);
  progressContainer.appendChild(downloadButton);
  progressContainer.appendChild(closeButton);
  document.body.appendChild(progressContainer);
};

const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};


const updateProgressBar = (progress) => {
  if (!progressBar) {
    createUIElements();
  }
  progressBar.style.width = `${progress}%`;
};

const updatePauseButton = () => {
  if (pauseButton) {
    const playIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
    const pauseIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
    pauseButton.innerHTML = isPlaying ? pauseIcon : playIcon;
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

// Audio playback functions
const decodeAudioData = async (audioData) => {
  const arrayBuffer = new Uint8Array(audioData).buffer;
  audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  resetPlaybackPosition(); // Reset position when loading new audio
};

const resetPlaybackPosition = () => {
  pausedAt = 0;
  startTime = 0;
  if (progressBar) {
    updateProgressBar(0);
  }
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

  const wasPlaying = isPlaying;
  if (isPlaying) {
    stopAudio();
  }

  pausedAt = Math.max(0, Math.min(newTime, audioBuffer.duration));
  
  if (wasPlaying) {
    playAudio();
  } else {
    updateProgress();
  }
};

const skipAudio = (seconds) => {
  if (!audioBuffer) return;
  
  const wasPlaying = isPlaying;
  if (isPlaying) {
    pauseAudio();
  }
  
  const currentTime = pausedAt + (wasPlaying ? audioContext.currentTime - startTime : 0);
  const newTime = Math.max(0, Math.min(currentTime + seconds, audioBuffer.duration));
  
  pausedAt = newTime;
  
  if (wasPlaying) {
    playAudio();
  } else {
    updateProgress();
  }
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
    const currentTime = pausedAt + (isPlaying ? audioContext.currentTime - startTime : 0);
    const progress = (currentTime / audioBuffer.duration) * 100;
    updateProgressBar(progress);
    
    if (timeDisplay) {
      timeDisplay.textContent = `${formatTime(currentTime)} / ${formatTime(audioBuffer.duration)}`;
    }
    
    if (currentTime >= audioBuffer.duration) {
      pauseAudio();
      updatePauseButton();
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

const closePlayer = () => {
  stopAudio();
  removeUIElements();
  audioBuffer = null;
  resetPlaybackPosition(); // Reset position when closing the player
};

// Audio download function
const downloadAudio = () => {
  if (!audioBuffer) return;

  const offlineContext = new OfflineAudioContext(
    audioBuffer.numberOfChannels,
    audioBuffer.length,
    audioBuffer.sampleRate
  );

  const source = offlineContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineContext.destination);
  source.start();

  offlineContext.startRendering().then((renderedBuffer) => {
    const wavBlob = audioBufferToWav(renderedBuffer);
    const url = URL.createObjectURL(wavBlob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'tts_audio.wav';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);
  });
};

// Helper function to convert AudioBuffer to WAV
const audioBufferToWav = (buffer) => {
  const numberOfChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length * numberOfChannels * 2;
  const arrayBuffer = new ArrayBuffer(44 + length);
  const view = new DataView(arrayBuffer);

  // Write WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + length, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numberOfChannels * 2, true);
  view.setUint16(32, numberOfChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, length, true);

  // Write audio data
  const offset = 44;
  for (let i = 0; i < buffer.numberOfChannels; i++) {
    const channelData = buffer.getChannelData(i);
    for (let j = 0; j < channelData.length; j++) {
      const index = offset + (j * numberOfChannels + i) * 2;
      const sample = Math.max(-1, Math.min(1, channelData[j]));
      view.setInt16(index, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
    }
  }

  return new Blob([view], { type: 'audio/wav' });
};

const writeString = (view, offset, string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
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
    handleMessage(request, sender, sendResponse);
    return true; // Indicates that the response is sent asynchronously
  });
};

init();
