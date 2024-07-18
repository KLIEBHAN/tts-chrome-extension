const TTS_CONTENT = {
  LOG_PREFIX: '[TTS Plugin Content]',
  ERROR_PREFIX: '[TTS Plugin Content Error]',

  audioQueue: [],
  currentAudio: null,

  log(message, ...args) {
    console.log(`${this.LOG_PREFIX} ${message}`, ...args);
  },

  logError(message, ...args) {
    console.error(`${this.ERROR_PREFIX} ${message}`, ...args);
    chrome.runtime.sendMessage({action: "logError", error: message});
  },

  getSelectedText() {
    return window.getSelection().toString().trim();
  },

  playNextAudio() {
    if (this.audioQueue.length === 0) {
      this.log('Audio-Warteschlange leer');
      this.currentAudio = null;
      return;
    }
    
    const {data: audioData, isLastChunk} = this.audioQueue.shift();
    this.log('Spiele nächstes Audio ab, verbleibende Elemente:', this.audioQueue.length);
    
    try {
      this.currentAudio = new Audio("data:audio/mp3;base64," + audioData);
      
      this.currentAudio.onended = () => {
        this.log('Audio-Wiedergabe beendet');
        this.currentAudio = null;
        setTimeout(() => this.playNextAudio(), 50); // Kurze Verzögerung vor dem nächsten Audio
      };
      
      this.currentAudio.onerror = (error) => {
        this.logError('Fehler beim Abspielen des Audios:', error);
        this.showError("Fehler beim Abspielen des Audios: " + error.message);
        this.currentAudio = null;
        setTimeout(() => this.playNextAudio(), 50);
      };
      
      this.currentAudio.play().catch(error => {
        this.logError('Fehler beim Starten des Audios:', error);
        this.showError("Fehler beim Starten des Audios: " + error.message);
        this.currentAudio = null;
        setTimeout(() => this.playNextAudio(), 50);
      });
    } catch (error) {
      this.logError('Fehler beim Erstellen des Audio-Objekts:', error);
      this.showError("Fehler beim Erstellen des Audio-Objekts: " + error.message);
      setTimeout(() => this.playNextAudio(), 50);
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
    try {
      switch (request.action) {
        case 'getSelectedText':
          const selectedText = this.getSelectedText();
          this.log('Ausgewählter Text:', selectedText);
          sendResponse({text: selectedText});
          break;
        case 'playAudio':
          this.audioQueue.push({data: request.audioData, isLastChunk: request.isLastChunk});
          if (!this.currentAudio) {
            setTimeout(() => this.playNextAudio(), 50);
          }
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
    } catch (error) {
      this.logError('Fehler bei der Verarbeitung der Nachricht:', error);
      sendResponse({error: error.message});
    }
    return true; // Wichtig für asynchrone Antworten
  },

  init() {
    this.log('Content-Script geladen');
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
  }
};

TTS_CONTENT.init();