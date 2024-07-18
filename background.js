function log(message, ...args) {
  console.log(`[TTS Plugin] ${message}`, ...args);
}

function logError(message, ...args) {
  console.error(`[TTS Plugin Error] ${message}`, ...args);
}

function createContextMenu() {
  chrome.contextMenus.create({
    id: "readSelectedText",
    title: "Vorlesen",
    contexts: ["selection"]
  }, () => {
    if (chrome.runtime.lastError) {
      logError("Fehler beim Erstellen des Kontextmenüs:", chrome.runtime.lastError);
    } else {
      log("Kontextmenü erfolgreich erstellt");
    }
  });
}

chrome.runtime.onInstalled.addListener(() => {
  log("Plugin installiert oder aktualisiert");
  createContextMenu();
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  log("Kontextmenü geklickt", info, tab);
  if (info.menuItemId === "readSelectedText") {
    getSelectedTextAndRead(tab.id);
  }
});

function getSelectedTextAndRead(tabId) {
  log("Versuche, ausgewählten Text zu erhalten");
  chrome.tabs.sendMessage(tabId, {action: "getSelectedText"}, (response) => {
    if (chrome.runtime.lastError) {
      logError("Fehler beim Senden der Nachricht:", JSON.stringify(chrome.runtime.lastError));
      return;
    }
    if (response && response.text) {
      log("Ausgewählter Text erhalten, Länge:", response.text.length);
      readText(response.text, tabId);
    } else {
      logError("Kein Text erhalten");
      showError(tabId, "Kein Text ausgewählt");
    }
  });
}
function readText(text, tabId) {
  log("Starte Textverarbeitung");
  chrome.storage.local.get(['apiKey'], function(result) {
    if (result.apiKey) {
      log("API-Schlüssel gefunden, beginne Verarbeitung");
      const chunks = splitTextIntoChunks(text);
      processChunks(chunks, result.apiKey, tabId);
    } else {
      logError('API-Schlüssel nicht gefunden');
      showError(tabId, "API-Schlüssel nicht gefunden");
    }
  });
}

function splitTextIntoChunks(text, maxLength = 50) {
  const words = text.split(/\s+/);
  const chunks = [];
  let currentChunk = "";

  for (let word of words) {
    if ((currentChunk + word).length <= maxLength) {
      currentChunk += (currentChunk ? " " : "") + word;
    } else {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = word;
    }
  }

  if (currentChunk) chunks.push(currentChunk.trim());
  return chunks;
}

function processChunks(chunks, apiKey, tabId) {
  if (chunks.length === 0) {
    log("Alle Chunks verarbeitet");
    return;
  }

  const chunk = chunks.shift();
  log(`Verarbeite Chunk: ${chunk}`);

  fetchAudioFromOpenAI(chunk, apiKey)
    .then(audioData => sendAudioToContentScript(tabId, audioData, chunks.length === 0))
    .then(() => {
      if (chunks.length > 0) {
        setTimeout(() => processChunks(chunks, apiKey, tabId), 100); // Reduzierte Verzögerung
      }
    })
    .catch(error => {
      logError('Fehler beim Verarbeiten des Chunks:', error);
      showError(tabId, "Fehler beim Verarbeiten des Textes: " + error.message);
    });
}
function fetchAudioFromOpenAI(text, apiKey) {
  log("Sende Anfrage an OpenAI API");
  return fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: "tts-1",
      input: text,
      voice: "alloy"
    })
  })
  .then(response => {
    if (!response.ok) {
      return response.text().then(errorText => {
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      });
    }
    log("Antwort von OpenAI erhalten");
    return response.arrayBuffer();
  })
  .then(audioData => {
    log("Audio-Daten erhalten, Größe:", audioData.byteLength);
    return btoa(String.fromCharCode(...new Uint8Array(audioData)));
  });
}

function sendAudioToContentScript(tabId, audioData, isLastChunk) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, {action: "playAudio", audioData: audioData, isLastChunk: isLastChunk}, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(`Fehler beim Senden der Audio-Daten: ${chrome.runtime.lastError.message}`));
      } else {
        log("Audio-Daten erfolgreich gesendet");
        resolve();
      }
    });
  });
}


function showError(tabId, message) {
  logError("Zeige Fehler an:", message);
  chrome.tabs.sendMessage(tabId, {action: "showError", error: message});
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "logError") {
    logError("Fehler vom Content-Script:", request.error);
  }
});