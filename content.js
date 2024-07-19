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
const StateManager = {
  audioContext: null,
  source: null,
  gainNode: null,
  audioBuffer: null,
  startTime: 0,
  pausedAt: 0,
  isPlaying: false,
  isMuted: false,
  lastVolume: 1,
  playbackRate: DEFAULT_PLAYBACK_SPEED,

  resetPlaybackPosition: function() {
    this.pausedAt = 0;
    this.startTime = 0;
    if (UIManager.progressBar) {
      UIManager.updateProgressBar(0);
    }
  },

  setPlaybackRate: function(rate) {
    this.playbackRate = rate;
    if (this.source) {
      this.source.playbackRate.setValueAtTime(rate, this.audioContext.currentTime);
    }
  }
};

// Audio Processing
const AudioProcessor = {
  initAudioContext: async function() {
    if (!StateManager.audioContext) {
      StateManager.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      StateManager.gainNode = StateManager.audioContext.createGain();
      StateManager.gainNode.connect(StateManager.audioContext.destination);
    }
  },

  decodeAudioData: async function(audioData) {
    const arrayBuffer = new Uint8Array(audioData).buffer;
    StateManager.audioBuffer = await StateManager.audioContext.decodeAudioData(arrayBuffer);
    StateManager.resetPlaybackPosition();
  },

  playAudio: function() {
    if (!StateManager.audioBuffer) return;

    StateManager.source = StateManager.audioContext.createBufferSource();
    StateManager.source.buffer = StateManager.audioBuffer;
    StateManager.source.connect(StateManager.gainNode);
    
    StateManager.source.playbackRate.setValueAtTime(StateManager.playbackRate, StateManager.audioContext.currentTime);
    
    StateManager.startTime = StateManager.audioContext.currentTime;
    StateManager.source.start(0, StateManager.pausedAt);
    StateManager.isPlaying = true;

    UIManager.updateProgress();
    UIManager.updatePauseButton();
  },

  pauseAudio: function() {
    if (!StateManager.isPlaying) return;

    StateManager.source.stop();
    StateManager.pausedAt += StateManager.audioContext.currentTime - StateManager.startTime;
    StateManager.isPlaying = false;

    clearInterval(UIManager.progressInterval);
    UIManager.updatePauseButton();
  },

  stopAudio: function() {
    if (StateManager.source) {
      StateManager.source.stop();
    }
    StateManager.isPlaying = false;
    clearInterval(UIManager.progressInterval);
  },

  seekAudio: function(newTime) {
    if (!StateManager.audioBuffer) return;

    const wasPlaying = StateManager.isPlaying;
    if (StateManager.isPlaying) {
      this.stopAudio();
    }

    StateManager.pausedAt = Math.max(0, Math.min(newTime, StateManager.audioBuffer.duration));
    
    if (wasPlaying) {
      this.playAudio();
    } else {
      UIManager.updateProgress();
    }
  },

  skipAudio: function(seconds) {
    if (!StateManager.audioBuffer) return;
    
    const wasPlaying = StateManager.isPlaying;
    if (StateManager.isPlaying) {
      this.pauseAudio();
    }
    
    const currentTime = StateManager.pausedAt + (wasPlaying ? StateManager.audioContext.currentTime - StateManager.startTime : 0);
    const newTime = Math.max(0, Math.min(currentTime + seconds, StateManager.audioBuffer.duration));
    
    StateManager.pausedAt = newTime;
    
    if (wasPlaying) {
      this.playAudio();
    } else {
      UIManager.updateProgress();
    }
  },

  setVolume: function(volume) {
    if (StateManager.gainNode) {
      StateManager.gainNode.gain.setValueAtTime(volume, StateManager.audioContext.currentTime);
    }
    if (volume > 0) {
      StateManager.lastVolume = volume;
    }
  },

  toggleMute: function() {
    if (StateManager.isMuted) {
      this.setVolume(StateManager.lastVolume);
      UIManager.volumeControl.value = StateManager.lastVolume;
    } else {
      StateManager.lastVolume = parseFloat(UIManager.volumeControl.value);
      this.setVolume(0);
      UIManager.volumeControl.value = 0;
    }
    StateManager.isMuted = !StateManager.isMuted;
    UIManager.updateVolumeIcon(StateManager.isMuted ? 0 : StateManager.lastVolume);
  },

  // Convert AudioBuffer to MP3 using lamejs
  audioBufferToMp3: function(buffer) {
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
  },

  downloadAudio: async function() {
    if (!StateManager.audioBuffer) return;

    try {
      // Create an offline audio context to render the entire audio buffer
      const offlineContext = new OfflineAudioContext(
        StateManager.audioBuffer.numberOfChannels,
        StateManager.audioBuffer.length,
        StateManager.audioBuffer.sampleRate
      );

      const source = offlineContext.createBufferSource();
      source.buffer = StateManager.audioBuffer;
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
      const mp3Blob = this.audioBufferToMp3(renderedBuffer);
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
      UIManager.showError('Failed to download audio. Please try again.');
    }
  },
};

// UI Management
const UIManager = {
  progressContainer: null,
  progressBar: null,
  pauseButton: null,
  timeDisplay: null,
  volumeControl: null,
  volumeIcon: null,
  progressInterval: null,
  tooltipElement: null,

  createUIElements: function() {
    this.progressContainer = document.createElement('div');
    this.progressContainer.style.cssText = `
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

      this.progressBar = document.createElement('div');
      this.progressBar.style.cssText = `
        height: 100%;
        width: 0%;
        background-color: rgba(76, 175, 80, 0.7);
        transition: width 0.3s ease-out;
      `;

      container.appendChild(this.progressBar);
      container.addEventListener('click', this.handleProgressBarClick);
      return container;
    };

    // Create time display element
    const createTimeDisplay = () => {
      this.timeDisplay = document.createElement('div');
      this.timeDisplay.style.cssText = `
        color: white;
        font-size: 12px;
        margin-right: 10px;
        font-family: Arial, sans-serif;
      `;
      this.timeDisplay.textContent = '0:00 / 0:00';
      return this.timeDisplay;
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
        this.showTooltip(button, tooltip);
      });
      button.addEventListener('mouseout', () => {
        button.style.opacity = '0.7';
        this.hideTooltip();
      });
      return button;
    };

    // Create volume control slider
    const createVolumeControl = () => {
      this.volumeControl = document.createElement('input');
      this.volumeControl.type = 'range';
      this.volumeControl.min = 0;
      this.volumeControl.max = 1;
      this.volumeControl.step = 0.1;
      this.volumeControl.value = 1;
      this.volumeControl.style.cssText = `
        width: 80px;
        margin-right: 10px;
        -webkit-appearance: none;
        background: rgba(255, 255, 255, 0.3);
        outline: none;
        opacity: 0.7;
        transition: opacity 0.2s;
      `;
      this.volumeControl.addEventListener('input', this.handleVolumeChange);
      this.volumeControl.addEventListener('mouseover', () => {
        this.volumeControl.style.opacity = '1';
        this.showTooltip(this.volumeControl, 'Adjust volume');
      });
      this.volumeControl.addEventListener('mouseout', () => {
        this.volumeControl.style.opacity = '0.7';
        this.hideTooltip();
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

      this.volumeControl.style.cssText += `
        &::-webkit-slider-thumb { ${thumbStyle} }
        &::-moz-range-thumb { ${thumbStyle} }
        &::-webkit-slider-runnable-track { ${trackStyle} }
        &::-moz-range-track { ${trackStyle} }
      `;

      return this.volumeControl;
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

      speedControl.addEventListener('change', this.handleSpeedChange);
      return speedControl;
    };

    // Create control buttons with SVG icons
    const skipBackButton = createButton(
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 17l-5-5 5-5M18 17l-5-5 5-5"/><text x="19.5" y="12" font-family="Arial" font-size="9" fill="currentColor" stroke-width="0.3">5</text></svg>',
      () => AudioProcessor.skipAudio(-5),
      'Skip backward (5 seconds)'
    );
    
    const skipForwardButton = createButton(
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 17l5-5-5-5M6 17l5-5-5-5"/><text x="19.5" y="12" font-family="Arial" font-size="9" fill="currentColor" stroke-width="0.3">5</text></svg>',
      () => AudioProcessor.skipAudio(5),
      'Skip forward (5 seconds)'
    );
    
    this.pauseButton = createButton(
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>',
      this.togglePlayPause,
      'Play/Pause'
    );
    
    const downloadButton = createButton(
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>',
      () => AudioProcessor.downloadAudio(),
      'Download audio as MP3'
    );
    
    const closeButton = createButton(
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
      this.closePlayer,
      'Close player'
    );

    this.volumeIcon = createButton(
      this.getVolumeIconSVG(1),
      () => AudioProcessor.toggleMute(),
      'Mute/Unmute'
    );
    this.volumeIcon.style.cursor = 'pointer';

    // Assemble all UI elements
    this.progressContainer.appendChild(skipBackButton);
    this.progressContainer.appendChild(this.pauseButton);
    this.progressContainer.appendChild(skipForwardButton);
    this.progressContainer.appendChild(createProgressBar());
    this.progressContainer.appendChild(createTimeDisplay());
    this.progressContainer.appendChild(createSpeedControl());
    this.progressContainer.appendChild(this.volumeIcon);
    this.progressContainer.appendChild(createVolumeControl());
    this.progressContainer.appendChild(downloadButton);
    this.progressContainer.appendChild(closeButton);
    document.body.appendChild(this.progressContainer);
  },

  // Create and show tooltip
  showTooltip: function(element, text) {
    if (this.tooltipElement) {
      this.hideTooltip();
    }
    this.tooltipElement = document.createElement('div');
    this.tooltipElement.textContent = text;
    this.tooltipElement.style.cssText = `
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
    element.appendChild(this.tooltipElement);
  },

  // Hide tooltip
  hideTooltip: function() {
    if (this.tooltipElement && this.tooltipElement.parentNode) {
      this.tooltipElement.parentNode.removeChild(this.tooltipElement);
    }
    this.tooltipElement = null;
  },

  // Handle volume change event
  handleVolumeChange: function(event) {
    const volume = parseFloat(event.target.value);
    AudioProcessor.setVolume(volume);
    UIManager.updateVolumeIcon(volume);
  },

  // Update volume icon based on current volume
  updateVolumeIcon: function(volume) {
    this.volumeIcon.innerHTML = this.getVolumeIconSVG(StateManager.isMuted ? 0 : volume);
  },

  // Get appropriate volume icon SVG based on volume level
  getVolumeIconSVG: function(volume) {
    if (volume === 0) {
      return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>';
    } else if (volume < 0.5) {
      return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>';
    } else {
      return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>';
    }
  },

  // Update progress bar width
  updateProgressBar: function(progress) {
    if (!this.progressBar) {
      this.createUIElements();
    }
    this.progressBar.style.width = `${progress}%`;
  },

  // Update pause/play button icon
  updatePauseButton: function() {
    if (this.pauseButton) {
      const playIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
      const pauseIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
      this.pauseButton.innerHTML = StateManager.isPlaying ? pauseIcon : playIcon;
    }
  },

  // Remove UI elements from DOM
  removeUIElements: function() {
    if (this.progressContainer) {
      this.progressContainer.remove();
      this.progressContainer = null;
      this.progressBar = null;
      this.pauseButton = null;
    }
  },

  // Handle click on progress bar to seek audio
  handleProgressBarClick: function(event) {
    if (!StateManager.audioBuffer) return;

    const progressBarContainer = event.currentTarget;
    const clickPosition = event.offsetX / progressBarContainer.offsetWidth;
    const newTime = clickPosition * StateManager.audioBuffer.duration;

    AudioProcessor.seekAudio(newTime);
  },

  // Update progress bar and time display
  updateProgress: function() {
    clearInterval(this.progressInterval);
    this.progressInterval = setInterval(() => {
      const currentTime = StateManager.pausedAt + (StateManager.isPlaying ? (StateManager.audioContext.currentTime - StateManager.startTime) * StateManager.playbackRate : 0);
      const progress = (currentTime / StateManager.audioBuffer.duration) * 100;
      this.updateProgressBar(progress);
      
      if (this.timeDisplay) {
        this.timeDisplay.textContent = `${formatTime(currentTime)} / ${formatTime(StateManager.audioBuffer.duration)}`;
      }
      
      if (currentTime >= StateManager.audioBuffer.duration) {
        AudioProcessor.pauseAudio();
        this.updatePauseButton();
      }
    }, 100);
  },

  // Toggle between play and pause
  togglePlayPause: async function() {
    await AudioProcessor.initAudioContext();
    
    if (StateManager.isPlaying) {
      AudioProcessor.pauseAudio();
    } else {
      AudioProcessor.playAudio();
    }
  },

  // Close player and reset state
  closePlayer: function() {
    AudioProcessor.stopAudio();
    this.removeUIElements();
    StateManager.audioBuffer = null;
    StateManager.resetPlaybackPosition();
  },

  // Handle playback speed change
  handleSpeedChange: function(event) {
    StateManager.setPlaybackRate(parseFloat(event.target.value));
  },

  // Display error message to the user
  showError: function(message) {
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
  },

  // Create and manage loading indicator
  createLoadingIndicator: function() {
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
  },

  showLoadingIndicator: function() {
    const existingIndicator = document.getElementById('tts-loading-indicator');
    if (existingIndicator) {
      existingIndicator.style.display = 'flex';
    } else {
      this.createLoadingIndicator();
    }
  },

  hideLoadingIndicator: function() {
    const indicator = document.getElementById('tts-loading-indicator');
    if (indicator) {
      indicator.style.display = 'none';
    }
  }
};

// Main logic and message handling
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
        UIManager.showLoadingIndicator();
        sendResponse({success: true});
        break;
      case 'hideLoading':
        UIManager.hideLoadingIndicator();
        sendResponse({success: true});
        break;
      case 'playAudioData':
      UIManager.hideLoadingIndicator(); // Hide loading indicator before playing audio
      await AudioProcessor.initAudioContext();
      await AudioProcessor.decodeAudioData(request.audioData);
      await UIManager.togglePlayPause();
      sendResponse({success: true});
      break;
    case 'togglePlayPause':
      await UIManager.togglePlayPause();
      sendResponse({success: true});
      break;
    case 'showError':
        UIManager.showError(request.error);
        sendResponse({success: true});
        break;
    default:
      throw new Error(`Unknown action: ${request.action}`);
  }
} catch (error) {
  UIManager.hideLoadingIndicator(); // Ensure loading indicator is hidden in case of error
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