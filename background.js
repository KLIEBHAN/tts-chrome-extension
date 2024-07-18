const TTS_PLUGIN = {
  LOG_PREFIX: '[TTS Plugin]',
  ERROR_PREFIX: '[TTS Plugin Error]',
  CONTEXT_MENU_ID: 'readSelectedText',
  CONTEXT_MENU_TITLE: 'Vorlesen',
  API_ENDPOINT: 'https://api.openai.com/v1/audio/speech',
  TTS_MODEL: 'tts-1',

  log(message, ...args) {
    console.log(`${this.LOG_PREFIX} ${message}`, ...args);
  },

  logError(message, ...args) {
    console.error(`${this.ERROR_PREFIX} ${message}`, ...args);
  },
  
  showError(tabId, message) {
    this.logError('Zeige Fehler an:', message);
    chrome.tabs.sendMessage(tabId, { action: 'showError', error: message });
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

  async getSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['apiKey', 'voice'], (result) => {
        resolve({
          apiKey: result.apiKey,
          voice: result.voice || 'alloy' // Default to 'alloy' if no voice is set
        });
      });
    });
  },

  async fetchAudioFromOpenAI(text, apiKey, voice) {
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
          voice: voice
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      this.log('Audio-Daten von OpenAI erhalten');
      return await response.arrayBuffer();
    } catch (error) {
      this.logError('Fehler beim Abrufen der Audio-Daten:', error);
      throw error;
    }
  },
  
  async sendAudioDataToContentScript(tabId, audioData) {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, { 
        action: 'playAudioData', 
        audioData: Array.from(new Uint8Array(audioData))
      }, () => {
        if (chrome.runtime.lastError) {
          this.logError('Fehler beim Senden der Audio-Daten:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          this.log('Audio-Daten erfolgreich gesendet');
          resolve();
        }
      });
    });
  },


  async handleContextMenuClick(info, tab) {
    this.log('Kontextmenü geklickt', info, tab);
    if (info.menuItemId === this.CONTEXT_MENU_ID) {
      try {
        const selectedText = await this.getSelectedText(tab.id);
        if (selectedText) {
          const settings = await this.getSettings();
          if (settings.apiKey) {
            const audioData = await this.fetchAudioFromOpenAI(selectedText, settings.apiKey, settings.voice);
            await this.sendAudioDataToContentScript(tab.id, audioData);
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
