// Constants and Configuration
const TTS_CONTENT = {
  LOG_PREFIX: '[TTS Plugin Content]',
  ERROR_PREFIX: '[TTS Plugin Content Error]',
};

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const DEFAULT_PLAYBACK_SPEED = 1;

// Utility Functions
const log = (message, ...args) => console.log(`${TTS_CONTENT.LOG_PREFIX} ${message}`, ...args);
const logError = (message, ...args) => {
  console.error(`${TTS_CONTENT.ERROR_PREFIX} ${message}`, ...args);
  chrome.runtime.sendMessage({action: "logError", error: message});
};

// Format seconds into MM:SS format
const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// State Management
let audioContext = null;
let source = null;
let gainNode = null;
let audioBuffer = null;
let startTime = 0;
let pausedAt = 0;
let isPlaying = false;
let isMuted = false;
let lastVolume = 1;
let playbackRate = DEFAULT_PLAYBACK_SPEED;

// UI Elements
let progressContainer = null;
let progressBar = null;
let pauseButton = null;
let timeDisplay = null;
let volumeControl = null;
let volumeIcon = null;
let progressInterval = null;
let tooltipElement = null;

// Initialize Web Audio API context
const initAudioContext = async () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    gainNode = audioContext.createGain();
    gainNode.connect(audioContext.destination);
  }
};

// Create and append UI elements to the DOM
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

  // Create progress bar with click functionality
  const createProgressBar = () => {
    const container = document.createElement('div');
    container.style.cssText = `
      flex-grow: 1;
      height: 5px;
      background-color: rgba(255, 255, 255, 0.3);
      margin: 0 10px;
      cursor: pointer;
    `;

    progressBar = document.createElement('div');
    progressBar.style.cssText = `
      height: 100%;
      width: 0%;
      background-color: rgba(76, 175, 80, 0.7);
      transition: width 0.3s ease-out;
    `;

    container.appendChild(progressBar);
    container.addEventListener('click', handleProgressBarClick);
    return container;
  };

  // Create time display element
  const createTimeDisplay = () => {
    timeDisplay = document.createElement('div');
    timeDisplay.style.cssText = `
      color: white;
      font-size: 12px;
      margin-right: 10px;
      font-family: Arial, sans-serif;
    `;
    timeDisplay.textContent = '0:00 / 0:00';
    return timeDisplay;
  };

  // Create button with SVG icon and tooltip
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
    button.addEventListener('mouseover', () => {
      button.style.opacity = '1';
      showTooltip(button, tooltip);
    });
    button.addEventListener('mouseout', () => {
      button.style.opacity = '0.7';
      hideTooltip();
    });
    return button;
  };

  // Create volume control slider
  const createVolumeControl = () => {
    volumeControl = document.createElement('input');
    volumeControl.type = 'range';
    volumeControl.min = 0;
    volumeControl.max = 1;
    volumeControl.step = 0.1;
    volumeControl.value = 1;
    volumeControl.style.cssText = `
      width: 80px;
      margin-right: 10px;
      -webkit-appearance: none;
      background: rgba(255, 255, 255, 0.3);
      outline: none;
      opacity: 0.7;
      transition: opacity 0.2s;
    `;
    volumeControl.addEventListener('input', handleVolumeChange);
    volumeControl.addEventListener('mouseover', () => {
      volumeControl.style.opacity = '1';
      showTooltip(volumeControl, 'Adjust volume');
    });
    volumeControl.addEventListener('mouseout', () => {
      volumeControl.style.opacity = '0.7';
      hideTooltip();
    });

    // Style volume control for webkit and mozilla browsers
    const thumbStyle = `
      -webkit-appearance: none;
      appearance: none;
      width: 15px;
      height: 15px;
      border-radius: 50%;
      background: white;
      cursor: pointer;
    `;

    const trackStyle = `
      width: 100%;
      height: 5px;
      cursor: pointer;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 5px;
    `;

    volumeControl.style.cssText += `
      &::-webkit-slider-thumb { ${thumbStyle} }
      &::-moz-range-thumb { ${thumbStyle} }
      &::-webkit-slider-runnable-track { ${trackStyle} }
      &::-moz-range-track { ${trackStyle} }
    `;

    return volumeControl;
  };

  // Create playback speed control
  const createSpeedControl = () => {
    const speedControl = document.createElement('select');
    speedControl.id = 'speed-control';
    speedControl.style.cssText = `
      margin-right: 10px;
      background-color: rgba(255, 255, 255, 0.2);
      color: white;
      border: none;
      border-radius: 4px;
      padding: 5px;
    `;
    
    PLAYBACK_SPEEDS.forEach(speed => {
      const option = document.createElement('option');
      option.value = speed;
      option.textContent = `${speed}x`;
      if (speed === DEFAULT_PLAYBACK_SPEED) option.selected = true;
      speedControl.appendChild(option);
    });

    speedControl.addEventListener('change', handleSpeedChange);
    return speedControl;
  };

  // Create control buttons with SVG icons
  const skipBackButton = createButton(
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 17l-5-5 5-5M18 17l-5-5 5-5"/><text x="19.5" y="12" font-family="Arial" font-size="9" fill="currentColor" stroke-width="0.3">5</text></svg>',
    () => skipAudio(-5),
    'Skip backward (5 seconds)'
  );
  
  const skipForwardButton = createButton(
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 17l5-5-5-5M6 17l5-5-5-5"/><text x="19.5" y="12" font-family="Arial" font-size="9" fill="currentColor" stroke-width="0.3">5</text></svg>',
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
    'Download audio as MP3'
  );
  
  const closeButton = createButton(
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
    closePlayer,
    'Close player'
  );

  volumeIcon = createButton(
    getVolumeIconSVG(1),
    toggleMute,
    'Mute/Unmute'
  );
  volumeIcon.style.cursor = 'pointer';

  // Assemble all UI elements
  progressContainer.appendChild(skipBackButton);
  progressContainer.appendChild(pauseButton);
  progressContainer.appendChild(skipForwardButton);
  progressContainer.appendChild(createProgressBar());
  progressContainer.appendChild(createTimeDisplay());
  progressContainer.appendChild(createSpeedControl());
  progressContainer.appendChild(volumeIcon);
  progressContainer.appendChild(createVolumeControl());
  progressContainer.appendChild(downloadButton);
  progressContainer.appendChild(closeButton);
  document.body.appendChild(progressContainer);
};

// Create and show tooltip
const showTooltip = (element, text) => {
  if (tooltipElement) {
    hideTooltip();
  }
  tooltipElement = document.createElement('div');
  tooltipElement.textContent = text;
  tooltipElement.style.cssText = `
    position: absolute;
    background-color: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 5px 10px;
    border-radius: 4px;
    font-size: 12px;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    white-space: nowrap;
    z-index: 10002;
    pointer-events: none;
  `;
  element.appendChild(tooltipElement);
};

// Hide tooltip
const hideTooltip = () => {
  if (tooltipElement && tooltipElement.parentNode) {
    tooltipElement.parentNode.removeChild(tooltipElement);
  }
  tooltipElement = null;
};

// Handle volume change event
const handleVolumeChange = (event) => {
  const volume = parseFloat(event.target.value);
  setVolume(volume);
  updateVolumeIcon(volume);
};

// Set audio volume
const setVolume = (volume) => {
  if (gainNode) {
    gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
  }
  if (volume > 0) {
    lastVolume = volume;
  }
};

// Toggle mute/unmute
const toggleMute = () => {
  if (isMuted) {
    setVolume(lastVolume);
    volumeControl.value = lastVolume;
  } else {
    lastVolume = parseFloat(volumeControl.value);
    setVolume(0);
    volumeControl.value = 0;
  }
  isMuted = !isMuted;
  updateVolumeIcon(lastVolume);
};

// Update volume icon based on current volume
const updateVolumeIcon = (volume) => {
  volumeIcon.innerHTML = getVolumeIconSVG(isMuted ? 0 : volume);
};

// Get appropriate volume icon SVG based on volume level
const getVolumeIconSVG = (volume) => {
  if (volume === 0) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>';
  } else if (volume < 0.5) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>';
  } else {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>';
  }
};

// Update progress bar width
const updateProgressBar = (progress) => {
  if (!progressBar) {
    createUIElements();
  }
  progressBar.style.width = `${progress}%`;
};

// Update pause/play button icon
const updatePauseButton = () => {
  if (pauseButton) {
    const playIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
    const pauseIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
    pauseButton.innerHTML = isPlaying ? pauseIcon : playIcon;
  }
};

// Remove UI elements from DOM
const removeUIElements = () => {
  if (progressContainer) {
    progressContainer.remove();
    progressContainer = null;
    progressBar = null;
    pauseButton = null;
  }
};

// Handle click on progress bar to seek audio
const handleProgressBarClick = (event) => {
  if (!audioBuffer) return;

  const progressBarContainer = event.currentTarget;
  const clickPosition = event.offsetX / progressBarContainer.offsetWidth;
  const newTime = clickPosition * audioBuffer.duration;

  seekAudio(newTime);
};

// Decode audio data from ArrayBuffer
const decodeAudioData = async (audioData) => {
  const arrayBuffer = new Uint8Array(audioData).buffer;
  audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  resetPlaybackPosition();
};

// Reset playback position to start
const resetPlaybackPosition = () => {
  pausedAt = 0;
  startTime = 0;
  if (progressBar) {
    updateProgressBar(0);
  }
};

// Stop audio playback
const stopAudio = () => {
  if (source) {
    source.stop();
  }
  isPlaying = false;
  clearInterval(progressInterval);
};

// Seek audio to specific time
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

// Skip audio forward or backward
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

// Play audio from current position
const playAudio = () => {
  if (!audioBuffer) return;

  source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(gainNode);
  
  source.playbackRate.setValueAtTime(playbackRate, audioContext.currentTime);
  
  startTime = audioContext.currentTime;
  source.start(0, pausedAt);
  isPlaying = true;

  updateProgress();
  updatePauseButton();
};

// Pause audio playback
const pauseAudio = () => {
  if (!isPlaying) return;

  source.stop();
  pausedAt += audioContext.currentTime - startTime;
  isPlaying = false;

  clearInterval(progressInterval);
  updatePauseButton();
};

// Update progress bar and time display
const updateProgress = () => {
  clearInterval(progressInterval);
  progressInterval = setInterval(() => {
    const currentTime = pausedAt + (isPlaying ? (audioContext.currentTime - startTime) * playbackRate : 0);
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

// Toggle between play and pause
const togglePlayPause = async () => {
  await initAudioContext();
  
  if (isPlaying) {
    pauseAudio();
  } else {
    playAudio();
  }
};

// Close player and reset state
const closePlayer = () => {
  stopAudio();
  removeUIElements();
  audioBuffer = null;
  resetPlaybackPosition();
};

// Handle playback speed change
const handleSpeedChange = (event) => {
  playbackRate = parseFloat(event.target.value);
  if (source) {
    source.playbackRate.setValueAtTime(playbackRate, audioContext.currentTime);
  }
};

// Convert AudioBuffer to MP3 using lamejs
const audioBufferToMp3 = (buffer) => {
  const channels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bitRate = 128;
  
  const mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, bitRate);
  
  const mp3Data = [];
  const sampleBlockSize = 1152;
  
  // Convert Float32Array to Int16Array for MP3 encoding
  const convertBuffer = (arrayBuffer) => {
    const int16Buffer = new Int16Array(arrayBuffer.length);
    for (let i = 0; i < arrayBuffer.length; i++) {
      int16Buffer[i] = arrayBuffer[i] < 0 ? arrayBuffer[i] * 0x8000 : arrayBuffer[i] * 0x7FFF;
    }
    return int16Buffer;
  };
  
  const left = convertBuffer(buffer.getChannelData(0));
  const right = channels > 1 ? convertBuffer(buffer.getChannelData(1)) : left;
  
  // Encode audio data in chunks
  for (let i = 0; i < buffer.length; i += sampleBlockSize) {
    const leftChunk = left.subarray(i, i + sampleBlockSize);
    const rightChunk = right.subarray(i, i + sampleBlockSize);
    const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf);
    }
  }
  
  // Flush the encoder to get any remaining data
  const mp3buf = mp3encoder.flush();
  if (mp3buf.length > 0) {
    mp3Data.push(mp3buf);
  }
  
  // Combine all MP3 data chunks into a single Uint8Array
  const totalLength = mp3Data.reduce((acc, buf) => acc + buf.length, 0);
  const mp3Output = new Uint8Array(totalLength);
  let offset = 0;
  for (let buf of mp3Data) {
    mp3Output.set(buf, offset);
    offset += buf.length;
  }
  
  return new Blob([mp3Output], { type: 'audio/mp3' });
};

// Download audio as MP3 file
const downloadAudio = async () => {
  if (!audioBuffer) return;

  try {
    // Create an offline audio context to render the entire audio buffer
    const offlineContext = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );

    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineContext.destination);
    source.start();

    // Render the audio buffer
    const renderedBuffer = await offlineContext.startRendering();
    log('AudioBuffer details:', {
      numberOfChannels: renderedBuffer.numberOfChannels,
      length: renderedBuffer.length,
      sampleRate: renderedBuffer.sampleRate,
      duration: renderedBuffer.duration
    });

    // Convert the rendered buffer to MP3
    const mp3Blob = audioBufferToMp3(renderedBuffer);
    log('MP3 Blob size:', mp3Blob.size);

    // Create a download link and trigger the download
    const url = URL.createObjectURL(mp3Blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'tts_audio.mp3';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);
  } catch (error) {
    logError('Error during audio download:', error);
    showError('Failed to download audio. Please try again.');
  }
};

// Display error message to the user
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

// Create and manage loading indicator
const createLoadingIndicator = () => {
  const loadingDiv = document.createElement('div');
  loadingDiv.id = 'tts-loading-indicator';
  loadingDiv.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
  `;

  const spinner = document.createElement('div');
  spinner.style.cssText = `
    border: 5px solid #f3f3f3;
    border-top: 5px solid #3498db;
    border-radius: 50%;
    width: 50px;
    height: 50px;
    animation: spin 1s linear infinite;
  `;

  // Add keyframe animation for spinner
  const keyframes = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  const styleSheet = document.createElement("style");
  styleSheet.type = "text/css";
  styleSheet.innerText = keyframes;
  document.head.appendChild(styleSheet);

  loadingDiv.appendChild(spinner);
  document.body.appendChild(loadingDiv);

  return loadingDiv;
};

const showLoadingIndicator = () => {
  const existingIndicator = document.getElementById('tts-loading-indicator');
  if (existingIndicator) {
    existingIndicator.style.display = 'flex';
  } else {
    createLoadingIndicator();
  }
};

const hideLoadingIndicator = () => {
  const indicator = document.getElementById('tts-loading-indicator');
  if (indicator) {
    indicator.style.display = 'none';
  }
};

// Handle messages from the background script
const handleMessage = async (request, sender, sendResponse) => {
  log('Message received:', request);
  try {
    switch (request.action) {
      case 'getSelectedText':
        const selectedText = window.getSelection().toString().trim(); 
        log('Selected text:', selectedText);
        sendResponse({text: selectedText});
        break;
      case 'showLoading':
        showLoadingIndicator();
        sendResponse({success: true});
        break;
      case 'hideLoading':
        hideLoadingIndicator();
        sendResponse({success: true});
        break;
      case 'playAudioData':
        hideLoadingIndicator(); // Hide loading indicator before playing audio
        await initAudioContext();
        await decodeAudioData(request.audioData);
        await togglePlayPause();
        sendResponse({success: true});
        break;
      // ... (other cases remain the same)
    }
  } catch (error) {
    hideLoadingIndicator(); // Ensure loading indicator is hidden in case of error
    logError('Error handling message:', error);
    sendResponse({success: false, error: error.message});
  }
};

// Initialize the content script
const init = () => {
  log('Content script loaded');
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    handleMessage(request, sender, sendResponse);
    return true; // Indicates that the response is sent asynchronously
  });
};

init();