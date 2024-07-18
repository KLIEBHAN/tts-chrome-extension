const TTS_CONTENT = {
  LOG_PREFIX: '[TTS Plugin Content]',
  ERROR_PREFIX: '[TTS Plugin Content Error]',

  audioContext: null,

  log(message, ...args) {
    console.log(`${this.LOG_PREFIX} ${message}`, ...args);
  },

  logError(message, ...args) {
    console.error(`${this.ERROR_PREFIX} ${message}`, ...args);
    chrome.runtime.sendMessage({action: "logError", error: message});
  },

  async initAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
  },

  async playAudioData(audioData) {
    await this.initAudioContext();
    
    try {
      const arrayBuffer = new Uint8Array(audioData).buffer;
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      source.start(0);
      
      return new Promise(resolve => {
        source.onended = resolve;
      });
    } catch (error) {
      this.logError('Fehler beim Abspielen der Audio-Daten:', error);
      this.showError("Fehler beim Abspielen des Audios: " + error.message);
    }
  },

  showError(message) {
    this.logError('Fehler:', message);
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
  },

  handleMessage(request, sender, sendResponse) {
    this.log('Nachricht empfangen:', request);
    switch (request.action) {
      case 'getSelectedText':
        const selectedText = window.getSelection().toString().trim();
        this.log('Ausgewählter Text:', selectedText);
        sendResponse({text: selectedText});
        break;
      case 'playAudioData':
        // Starten Sie die Audio-Wiedergabe asynchron, ohne auf eine Antwort zu warten
        this.playAudioData(request.audioData).catch(error => {
          this.logError('Fehler beim Abspielen der Audio-Daten:', error);
          this.showError("Fehler beim Abspielen des Audios: " + error.message);
        });
        // Senden Sie sofort eine Antwort
        sendResponse({success: true});
        break;
      case 'showError':
        this.showError(request.error);
        sendResponse({success: true});
        break;
      default:
        this.logError('Unbekannte Aktion:', request.action);
        sendResponse({error: 'Unbekannte Aktion'});
    }
    // Wichtig: Rückgabewert true, um anzuzeigen, dass sendResponse asynchron aufgerufen wird
    return true;
  },

  init() {
    this.log('Content-Script geladen');
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
  }
};

TTS_CONTENT.init();
