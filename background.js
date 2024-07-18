const TTS_PLUGIN = {
  LOG_PREFIX: '[TTS Plugin]',
  ERROR_PREFIX: '[TTS Plugin Error]',
  CONTEXT_MENU_ID: 'readSelectedText',
  CONTEXT_MENU_TITLE: 'Vorlesen',
  MAX_CHUNK_LENGTH: 50,
  MIN_CHUNK_LENGTH: 25,
  API_ENDPOINT: 'https://api.openai.com/v1/audio/speech',
  TTS_MODEL: 'tts-1',
  VOICE: 'alloy',

  log(message, ...args) {
    console.log(`${this.LOG_PREFIX} ${message}`, ...args);
  },

  logError(message, ...args) {
    console.error(`${this.ERROR_PREFIX} ${message}`, ...args);
  },

  createContextMenu() {
    chrome.contextMenus.create({
      id: this.CONTEXT_MENU_ID,
      title: this.CONTEXT_MENU_TITLE,
      contexts: ['selection']
    }, () => {
      if (chrome.runtime.lastError) {
        this.logError('Fehler beim Erstellen des Kontextmenüs:', chrome.runtime.lastError);
      } else {
        this.log('Kontextmenü erfolgreich erstellt');
      }
    });
  },

  async getApiKey() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['apiKey'], (result) => {
        resolve(result.apiKey);
      });
    });
  },

  async fetchAudioFromOpenAI(text, apiKey) {
    this.log('Sende Anfrage an OpenAI API');
    try {
      const response = await fetch(this.API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.TTS_MODEL,
          input: text,
          voice: this.VOICE
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      this.log('Antwort von OpenAI erhalten');
      const audioData = await response.arrayBuffer();
      this.log('Audio-Daten erhalten, Größe:', audioData.byteLength);
      return btoa(String.fromCharCode(...new Uint8Array(audioData)));
    } catch (error) {
      this.logError('Fehler beim Abrufen der Audio-Daten:', error);
      throw error;
    }
  },

  splitTextIntoChunks(text) {
    const words = text.split(/\s+/);
    const chunks = [];
    let currentChunk = '';

    for (const word of words) {
      if (currentChunk.length + word.length + 1 <= this.MAX_CHUNK_LENGTH) {
        currentChunk += (currentChunk ? ' ' : '') + word;
      } else {
        if (currentChunk.length >= this.MIN_CHUNK_LENGTH) {
          chunks.push(currentChunk.trim());
          currentChunk = word;
        } else {
          // Wenn der aktuelle Chunk zu kurz ist, fügen wir das Wort trotzdem hinzu
          currentChunk += ' ' + word;
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  },

  async processChunks(chunks, apiKey, tabId) {
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      this.log(`Verarbeite Chunk ${i + 1}/${chunks.length}: "${chunk}"`);
      try {
        const audioData = await this.fetchAudioFromOpenAI(chunk, apiKey);
        await this.sendAudioToContentScript(tabId, audioData, i === chunks.length - 1);
      } catch (error) {
        this.logError('Fehler beim Verarbeiten des Chunks:', error);
        this.showError(tabId, `Fehler beim Verarbeiten des Textes: ${error.message}`);
        break;
      }
    }
  },

  async sendAudioToContentScript(tabId, audioData, isLastChunk) {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, { action: 'playAudio', audioData, isLastChunk }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(`Fehler beim Senden der Audio-Daten: ${chrome.runtime.lastError.message}`));
        } else {
          this.log('Audio-Daten erfolgreich gesendet');
          resolve();
        }
      });
    });
  },

  showError(tabId, message) {
    this.logError('Zeige Fehler an:', message);
    chrome.tabs.sendMessage(tabId, { action: 'showError', error: message });
  },

  async handleContextMenuClick(info, tab) {
    this.log('Kontextmenü geklickt', info, tab);
    if (info.menuItemId === this.CONTEXT_MENU_ID) {
      try {
        const selectedText = await this.getSelectedText(tab.id);
        if (selectedText) {
          const apiKey = await this.getApiKey();
          if (apiKey) {
            const chunks = this.splitTextIntoChunks(selectedText);
            await this.processChunks(chunks, apiKey, tab.id);
          } else {
            this.showError(tab.id, 'API-Schlüssel nicht gefunden. Bitte in den Einstellungen konfigurieren.');
          }
        } else {
          this.showError(tab.id, 'Kein Text ausgewählt');
        }
      } catch (error) {
        this.logError('Fehler bei der Verarbeitung:', error);
        this.showError(tab.id, `Fehler: ${error.message}`);
      }
    }
  },

  async getSelectedText(tabId) {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, { action: 'getSelectedText' }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(`Fehler beim Abrufen des ausgewählten Textes: ${chrome.runtime.lastError.message}`));
        } else if (response && response.text) {
          this.log('Ausgewählter Text erhalten, Länge:', response.text.length);
          resolve(response.text);
        } else {
          resolve(null);
        }
      });
    });
  },

  init() {
    chrome.runtime.onInstalled.addListener(() => {
      this.log('Plugin installiert oder aktualisiert');
      this.createContextMenu();
    });

    chrome.contextMenus.onClicked.addListener(this.handleContextMenuClick.bind(this));

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'logError') {
        this.logError('Fehler vom Content-Script:', request.error);
      }
    });

    this.log('Background script initialisiert');
  }
};

TTS_PLUGIN.init();
