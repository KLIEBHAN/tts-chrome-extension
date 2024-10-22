// Constants and Configuration
const TTS_CONTENT = {
  LOG_PREFIX: '[TTS Plugin Content]',
  ERROR_PREFIX: '[TTS Plugin Content Error]',
};

// UI Constants
const UI_CONSTANTS = {
  PLAYER_HEIGHT: '20',
  PROGRESS_BAR_HEIGHT: '2',
  VOLUME_CONTROL_WIDTH: '24',
  TOOLTIP_Z_INDEX: '10002',
  ERROR_DISPLAY_DURATION: 5000,
  ERROR_ANIMATION_DURATION: 300,
  PROGRESS_UPDATE_INTERVAL: 100,
  DOWNLOAD_LINK_REMOVAL_DELAY: 100,
};

// CSS Classes
const CSS_CLASSES = {
  PLAYER_CONTAINER: `
    fixed top-0 left-0 right-0 h-${UI_CONSTANTS.PLAYER_HEIGHT} bg-gray-900/60
    flex items-center px-6 text-white shadow-lg
    border-b border-gray-700/50 backdrop-filter backdrop-blur-sm
    transition-all duration-300 ease-in-out
  `,
  PROGRESS_BAR_CONTAINER: 'flex-grow h-2 bg-gray-700/50 rounded-full mx-4 cursor-pointer group relative',
  PROGRESS_BAR: 'h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300 ease-out relative',
  PROGRESS_HANDLE: 'absolute top-1/2 right-0 w-4 h-4 bg-white rounded-full -mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-md transform scale-0 group-hover:scale-100',
  TIME_DISPLAY: 'text-sm font-mono mr-4 min-w-[90px] text-center bg-gray-800/50 rounded-md px-2 py-1 transition-all duration-300 hover:bg-gray-700/70',
  BUTTON: `
    p-2 hover:bg-gray-700/50 rounded-full transition duration-300
    focus:outline-none focus:ring-2 focus:ring-blue-500/70
    text-gray-300 hover:text-white transform hover:scale-110
    active:scale-95
  `,
  VOLUME_CONTROL: `
    w-${UI_CONSTANTS.VOLUME_CONTROL_WIDTH} accent-blue-500 cursor-pointer
    appearance-none bg-gray-700/50 h-1 rounded-full
    focus:outline-none focus:ring-2 focus:ring-blue-500/70
    transition-all duration-300 hover:bg-gray-600/70
  `,
  SPEED_CONTROL: `
    bg-gray-800/50 text-white border-none rounded-md px-2 py-1 mr-2
    focus:outline-none focus:ring-2 focus:ring-blue-500/70
    text-xs appearance-none cursor-pointer
    transition duration-300 hover:bg-gray-700/70
  `,
  ERROR_MESSAGE: `
    fixed top-24 left-1/2 transform -translate-x-1/2
    bg-red-500 bg-opacity-90 text-white px-6 py-3 rounded-lg shadow-lg
    z-50 transition-all duration-300 ease-in-out
    opacity-0 translate-y-2 max-w-md text-center
  `,
  LOADING_INDICATOR: `
    fixed top-0 left-0 w-full h-full bg-black bg-opacity-50
    flex justify-center items-center z-50 backdrop-filter backdrop-blur-sm
  `,
  LOADING_SPINNER: `
    border-4 border-blue-500 border-t-transparent rounded-full
    w-16 h-16 animate-spin
  `,
  LOADING_TEXT: 'text-white text-xl mt-4 font-semibold',
};


const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const DEFAULT_PLAYBACK_SPEED = 1;

// Utility Functions
const log = (message, ...args) => console.log(`${TTS_CONTENT.LOG_PREFIX} ${message}`, ...args);
const debugLog = (message, data) => {
  console.log(`[TTS Debug] ${message}`, data);
};
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
  isPlayerVisible: false,
  lastVolume: 1,
  playbackRate: DEFAULT_PLAYBACK_SPEED,

  resetPlaybackState: function() {
    this.isPlaying = false;
    this.startTime = 0;
    this.pausedAt = 0;
    // Behalten Sie audioBuffer und andere relevante Audio-Informationen bei
    console.log('Playback state reset, audio buffer retained');
  },

  resetState: function() {
    console.log('Resetting state');
    this.audioContext = null;
    this.source = null;
    this.gainNode = null;
    this.audioBuffer = null;
    this.startTime = 0;
    this.pausedAt = 0;
    this.isPlaying = false;
    this.isMuted = false;
    this.isPlayerVisible = false;
    this.lastVolume = 1;
    this.playbackRate = DEFAULT_PLAYBACK_SPEED;
    
    console.log('State fully reset');
  },

  // Reset playback position and stop current audio source
  resetPlaybackPosition: function() {
    console.log('Resetting playback position');
    if (this.audioBuffer) {
      this.pausedAt = 0;
      this.startTime = 0;
      if (this.source) {
        this.source.stop();
        this.source.disconnect();
      }
      this.source = null;
      this.isPlaying = false;
      console.log('Playback position reset successfully');
    } else {
      console.warn('Cannot reset playback position: No audio buffer available');
    }
  },

  // Set playback rate and update audio source if it exists
  setPlaybackRate: function(rate) {
    this.playbackRate = rate;
    if (this.source) {
      this.source.playbackRate.setValueAtTime(rate, this.audioContext.currentTime);
    }
  },

  setPlayerVisibility: function(isVisible) {
    this.isPlayerVisible = isVisible;
  },

  hasAudio: function() {
    const hasAudioBuffer = this.audioBuffer !== null;
    console.log('Checking for audio:', hasAudioBuffer, 'Audio buffer:', this.audioBuffer);
    return hasAudioBuffer;
  },

  // Calculate current playback time based on AudioContext time and playback rate
  getCurrentTime: function() {
    if (this.isPlaying) {
      return (this.audioContext.currentTime - this.startTime) * this.playbackRate + this.pausedAt;
    } else {
      return this.pausedAt;
    }
  },
};

// Audio Processing
const AudioProcessor = {
  // Initialize AudioContext and create gain node
  initAudioContext: async function() {
    if (!StateManager.audioContext) {
      StateManager.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      StateManager.gainNode = StateManager.audioContext.createGain();
      StateManager.gainNode.connect(StateManager.audioContext.destination);
    }
  },

  // Im AudioProcessor
  setAudioData: function(audioData) {
    return new Promise(async (resolve, reject) => {
      try {
        await this.initAudioContext();
        const arrayBuffer = new Uint8Array(audioData).buffer;
        StateManager.audioBuffer = await StateManager.audioContext.decodeAudioData(arrayBuffer);
        console.log('New audio data set and decoded');
        resolve();
      } catch (error) {
        console.error('Error setting audio data:', error);
        reject(error);
      }
    });
  },

  // Decode audio data and store it in StateManager
  decodeAudioData: async function(audioData) {
    const arrayBuffer = new Uint8Array(audioData).buffer;
    StateManager.audioBuffer = await StateManager.audioContext.decodeAudioData(arrayBuffer);
    StateManager.resetPlaybackPosition();
  },

  // Create and start a new audio source
  playAudio: function() {
    if (!StateManager.audioBuffer) return;
  
    StateManager.source = StateManager.audioContext.createBufferSource();
    StateManager.source.buffer = StateManager.audioBuffer;
    StateManager.source.connect(StateManager.gainNode);
    
    StateManager.source.playbackRate.setValueAtTime(StateManager.playbackRate, StateManager.audioContext.currentTime);
    
    StateManager.startTime = StateManager.audioContext.currentTime;
    StateManager.source.start(0, StateManager.pausedAt);
    StateManager.isPlaying = true;
  
    log('Audio playing', { startTime: StateManager.startTime, pausedAt: StateManager.pausedAt });
  
    UIManager.updateProgress();
    UIManager.updatePauseButton();
  },

  // Pause audio playback and update state
  pauseAudio: function() {
    if (!StateManager.isPlaying) return;
  
    StateManager.source.stop();
    const elapsedTime = (StateManager.audioContext.currentTime - StateManager.startTime) * StateManager.playbackRate;
    StateManager.pausedAt += elapsedTime;
    StateManager.isPlaying = false;
  
    log('Audio paused', { pausedAt: StateManager.pausedAt });
  
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

  // Seek to a specific time in the audio
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

  // Skip forward or backward in the audio
  skipAudio: function(seconds) {
    if (!StateManager.audioBuffer) return;
    
    const currentTime = StateManager.getCurrentTime();
    const newTime = Math.max(0, Math.min(currentTime + seconds, StateManager.audioBuffer.duration));
    
    debugLog('Skipping audio', { currentTime, newTime, seconds });
    
    if (StateManager.isPlaying) {
      this.pauseAudio();
      StateManager.pausedAt = newTime;
      this.playAudio();
    } else {
      StateManager.pausedAt = newTime;
      UIManager.updateProgress();
    }
  },

  // Set volume of the gain node
  setVolume: function(volume) {
    if (StateManager.gainNode) {
      StateManager.gainNode.gain.setValueAtTime(volume, StateManager.audioContext.currentTime);
    }
    if (volume > 0) {
      StateManager.lastVolume = volume;
    }
  },

  // Toggle mute/unmute
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

  // Download audio as MP3
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
      }, UI_CONSTANTS.DOWNLOAD_LINK_REMOVAL_DELAY);
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


  ensurePlayerHostExists: function() {
    if (!document.getElementById('tts-player-host')) {
      console.log('Creating TTS player host');
      this.createUIElements();
    }
  },

  // Create and append UI elements to the DOM
  createUIElements: function() {
    console.log('Starting to create UI elements');
    
    if (document.getElementById('tts-player-host')) {
      console.log('TTS player host already exists, removing it');
      this.removeUIElements();
    }

    // Create a Shadow DOM for the player
    const shadowHost = document.createElement('div');
    shadowHost.id = 'tts-player-host';
    shadowHost.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      z-index: 2147483647;
    `;
    shadowHost.id = 'tts-player-host';
    const shadowRoot = shadowHost.attachShadow({mode: 'open'});

    // Add Tailwind styles to the Shadow DOM
    const style = document.createElement('style');
    style.textContent = `@import url('${chrome.runtime.getURL('dist/style.css')}');`;
    shadowRoot.appendChild(style);

    this.progressContainer = document.createElement('div');
    this.progressContainer.className = CSS_CLASSES.PLAYER_CONTAINER;

    // Ensure the player is always on top
    this.progressContainer.style.zIndex = '2147483647';
    this.progressContainer.style.position = 'fixed';

    // Create progress bar with click functionality
    const createProgressBar = () => {
      const container = document.createElement('div');
      container.className = CSS_CLASSES.PROGRESS_BAR_CONTAINER;
  
      this.progressBar = document.createElement('div');
      this.progressBar.className = CSS_CLASSES.PROGRESS_BAR;
  
      const progressHandle = document.createElement('div');
      progressHandle.className = CSS_CLASSES.PROGRESS_HANDLE;
      this.progressBar.appendChild(progressHandle);

      container.appendChild(this.progressBar);
      container.addEventListener('click', this.handleProgressBarClick);
      return container;
    };

    // Create time display element
    const createTimeDisplay = () => {
      this.timeDisplay = document.createElement('div');
      this.timeDisplay.className = CSS_CLASSES.TIME_DISPLAY;
      this.timeDisplay.textContent = '0:00 / 0:00';
      return this.timeDisplay;
    };
    
    // Create button with SVG icon and tooltip
    const createButton = (svgPath, onClick, tooltip) => {
      const button = document.createElement('button');
      button.innerHTML = svgPath;
      button.className = CSS_CLASSES.BUTTON;
      button.setAttribute('title', tooltip);
      button.addEventListener('click', onClick);
      return button;
    };

  // Create volume control slider
  const createVolumeControl = () => {
    const volumeContainer = document.createElement('div');
    volumeContainer.className = 'flex items-center space-x-2';

    this.volumeControl = document.createElement('input');
    this.volumeControl.type = 'range';
    this.volumeControl.min = 0;
    this.volumeControl.max = 1;
    this.volumeControl.step = 0.01;
    this.volumeControl.value = 1;
    this.volumeControl.className = CSS_CLASSES.VOLUME_CONTROL;
    this.volumeControl.addEventListener('input', this.handleVolumeChange);

    volumeContainer.appendChild(this.volumeIcon);
    volumeContainer.appendChild(this.volumeControl);
    return volumeContainer;
    };

  // Create playback speed control
  const createSpeedControl = () => {
    const speedControl = document.createElement('select');
    speedControl.id = 'speed-control';
    speedControl.className = CSS_CLASSES.SPEED_CONTROL;
    
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
      '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 17l-5-5 5-5M18 17l-5-5 5-5"/></svg>',
      () => AudioProcessor.skipAudio(-5),
      'Skip backward (5 seconds)'
  );
  
  const skipForwardButton = createButton(
      '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 17l5-5-5-5M6 17l5-5-5-5"/></svg>',
      () => AudioProcessor.skipAudio(5),
      'Skip forward (5 seconds)'
  );
  
  this.pauseButton = createButton(
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>',
      this.togglePlayPause,
      'Play/Pause'
  );
  
  const downloadButton = createButton(
      '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>',
      () => AudioProcessor.downloadAudio(),
      'Download audio as MP3'
  );
  
  const closeButton = createButton(
      '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
      this.closePlayer,
      'Close player'
  );

  this.volumeIcon = createButton(
      this.getVolumeIconSVG(1),
      () => AudioProcessor.toggleMute(),
      'Mute/Unmute'
  );

  // Assemble all UI elements
  const controlsContainer = document.createElement('div');
  controlsContainer.className = 'flex items-center space-x-2';
  controlsContainer.appendChild(skipBackButton);
  controlsContainer.appendChild(this.pauseButton);
  controlsContainer.appendChild(skipForwardButton);

  const rightControlsContainer = document.createElement('div');
  rightControlsContainer.className = 'flex items-center space-x-4';
  rightControlsContainer.appendChild(createSpeedControl());
  rightControlsContainer.appendChild(createVolumeControl());
  rightControlsContainer.appendChild(downloadButton);
  rightControlsContainer.appendChild(closeButton);

  this.progressContainer.appendChild(controlsContainer);
  this.progressContainer.appendChild(createProgressBar());
  this.progressContainer.appendChild(createTimeDisplay());
  this.progressContainer.appendChild(rightControlsContainer);

  shadowRoot.appendChild(this.progressContainer);
  document.body.appendChild(shadowHost);
  console.log('TTS player host created and added to DOM');

  StateManager.setPlayerVisibility(true);
  this.setHighestZIndex();
  return true;
},


  // Create and show tooltip
  showTooltip: function(element, text) {
    if (this.tooltipElement) {
      this.hideTooltip();
    }
    this.tooltipElement = document.createElement('div');
    this.tooltipElement.textContent = text;
    this.tooltipElement.style.zIndex = UI_CONSTANTS.TOOLTIP_Z_INDEX;
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
      console.warn('Progress bar not found. Attempting to recreate UI elements.');
      this.createUIElements();
      
      if (!this.progressBar) {
        console.error('Failed to create progress bar. Cannot update progress.');
        return;
      }
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
      StateManager.setPlayerVisibility(false);
    }
  },

  // Handle click on progress bar to seek audio
  handleProgressBarClick: function(event) {
    if (!StateManager.audioBuffer) return;
  
    const progressBarContainer = event.currentTarget;
    const clickPosition = event.offsetX / progressBarContainer.offsetWidth;
    const newTime = clickPosition * StateManager.audioBuffer.duration;
  
    debugLog('Progress bar clicked', { clickPosition, newTime });
  
    AudioProcessor.seekAudio(newTime);
  },

  // Update progress bar and time display
  updateProgress: function() {
    clearInterval(this.progressInterval);
    this.progressInterval = setInterval(() => {
      const currentTime = StateManager.getCurrentTime();
      const progress = (currentTime / StateManager.audioBuffer.duration) * 100;
      this.updateProgressBar(progress);
      
      if (this.timeDisplay) {
        this.timeDisplay.textContent = `${formatTime(currentTime)} / ${formatTime(StateManager.audioBuffer.duration)}`;
      }
      
      if (currentTime >= StateManager.audioBuffer.duration) {
        AudioProcessor.pauseAudio();
        this.updatePauseButton();
      }
    }, UI_CONSTANTS.PROGRESS_UPDATE_INTERVAL);
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

  // Restore player UI elements
  restorePlayer: function() {
    console.log('Attempting to restore player');
    console.log('Current player visibility:', StateManager.isPlayerVisible);
    console.log('Audio loaded:', StateManager.hasAudio());

    if (!StateManager.isPlayerVisible) {
      console.log('Player not visible, creating UI elements');
      const uiCreated = this.createUIElements();
      
      if (!uiCreated || !this.progressBar || !this.pauseButton) {
        const errorMessage = 'Failed to create UI elements. Please try again.';
        console.error(errorMessage);
        this.showError(errorMessage);
        return {success: false, message: errorMessage};
      }

  
      if (StateManager.hasAudio()) {
        console.log('Audio found, resetting playback position');
        StateManager.resetPlaybackPosition();
        this.updateProgress();
        this.updatePauseButton();
        if (this.timeDisplay) {
          this.timeDisplay.textContent = `0:00 / ${formatTime(StateManager.audioBuffer.duration)}`;
        }
        return {success: true, message: 'Player restored successfully with previous audio'};
      } else {
        const errorMessage = 'No audio loaded. Please select text and use "Read Aloud" to generate audio.';
        console.warn(errorMessage);
        this.showError(errorMessage);
        return {success: false, message: errorMessage};
      }
    } else {
      const errorMessage = 'The player is already visible.';
      console.warn(errorMessage);
      this.showError(errorMessage);
      return {success: false, message: errorMessage};
    }
  },

  // Close player and reset state
  closePlayer: function() {
    AudioProcessor.stopAudio();
    
    const playerHost = document.getElementById('tts-player-host');
    if (playerHost) {
      playerHost.remove();
    }
    
    this.progressBar = null;
    this.pauseButton = null;
    
    // Anstatt den gesamten Zustand zurückzusetzen, behalten wir das Audio bei
    StateManager.setPlayerVisibility(false);
    // Wir setzen nur die Wiedergabezustände zurück
    StateManager.resetPlaybackState();
    
    chrome.runtime.sendMessage({action: "playerClosed"});
    
    console.log('Player closed, visibility set to false, playback state reset');
  },

  // Handle playback speed change
  handleSpeedChange: function(event) {
    StateManager.setPlaybackRate(parseFloat(event.target.value));
  },

  // Display error message to the user
  showError: function(message) {
    console.error('Showing error:', message);
    let errorDiv = document.getElementById('tts-error-message');
    if (!errorDiv) {
      errorDiv = document.createElement('div');
      errorDiv.id = 'tts-error-message';
      errorDiv.className = CSS_CLASSES.ERROR_MESSAGE;
      document.body.appendChild(errorDiv);
    }
    errorDiv.textContent = message || 'An unknown error occurred';
    errorDiv.style.display = 'block';
    errorDiv.style.opacity = '1';
    errorDiv.style.transform = 'translate(-50%, 0)';
    setTimeout(() => {
      errorDiv.style.opacity = '0';
      errorDiv.style.transform = 'translate(-50%, -10px)';
      setTimeout(() => {
        errorDiv.style.display = 'none';
      }, UI_CONSTANTS.ERROR_ANIMATION_DURATION);
    }, UI_CONSTANTS.ERROR_DISPLAY_DURATION);
  },

  // Create loading indicator
  createLoadingIndicator: function() {
    this.ensurePlayerHostExists();

    // Find the shadow host element
    const shadowHost = document.getElementById('tts-player-host');
    if (!shadowHost) {
      console.error('TTS player host element still not found after creation attempt');
      return null;
    }
    const shadowRoot = shadowHost.shadowRoot;
  
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'tts-loading-indicator';
    loadingDiv.className = CSS_CLASSES.LOADING_INDICATOR;
  
    const spinner = document.createElement('div');
    spinner.className = CSS_CLASSES.LOADING_SPINNER;
  
    const loadingText = document.createElement('div');
    loadingText.textContent = 'Loading...';
    loadingText.className = CSS_CLASSES.LOADING_TEXT;
  
    const container = document.createElement('div');
    container.className = 'flex flex-col items-center';
    container.appendChild(spinner);
    container.appendChild(loadingText);
  
    loadingDiv.appendChild(container);
    
    // Add the loading indicator to the shadow root
    shadowRoot.appendChild(loadingDiv);
  
    return loadingDiv;
  },

  showLoadingIndicator: function() {
    this.ensurePlayerHostExists();
    
    const shadowHost = document.getElementById('tts-player-host');
    if (!shadowHost) {
      console.error('TTS player host element not found when showing loading indicator');
      return;
    }
    const shadowRoot = shadowHost.shadowRoot;
    let existingIndicator = shadowRoot.getElementById('tts-loading-indicator');
    if (existingIndicator) {
      existingIndicator.style.display = 'flex';
    } else {
      this.createLoadingIndicator();
    }
    console.log('Loading indicator shown');
  },
  
  hideLoadingIndicator: function() {
    const shadowHost = document.getElementById('tts-player-host');
    if (!shadowHost) {
      console.log('TTS player host not found when hiding loading indicator. It may have been already removed.');
      return;
    }
    const shadowRoot = shadowHost.shadowRoot;
    const indicator = shadowRoot.getElementById('tts-loading-indicator');
    if (indicator) {
      indicator.style.display = 'none';
      console.log('Loading indicator hidden');
    }
  },

  // Set the highest z-index for the player
  setHighestZIndex: function() {
    const shadowHost = document.getElementById('tts-player-host');
    if (!shadowHost) {
      console.error('TTS player host element not found');
      return;
    }
  
    // Find the highest z-index in the document
    let highestZ = Math.max(
      ...Array.from(document.querySelectorAll('body *'))
        .map(el => parseFloat(window.getComputedStyle(el).zIndex))
        .filter(zIndex => !isNaN(zIndex))
    );
  
    // Set the player's z-index to be higher than the highest found
    const newZIndex = Math.max(highestZ + 1, 2147483647);
    shadowHost.style.zIndex = newZIndex.toString();
  
    console.log(`Highest z-index set to: ${newZIndex}`);
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
        UIManager.hideLoadingIndicator();
        try {
          await AudioProcessor.setAudioData(request.audioData);
          await UIManager.togglePlayPause();
          sendResponse({success: true});
        } catch (error) {
          UIManager.showError('Failed to load audio data');
          sendResponse({success: false, error: error.message});
        }
      case 'restorePlayer':
        console.log('Received restorePlayer message');
        const result = UIManager.restorePlayer();
        console.log('Restore player result:', result);
        sendResponse(result);
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