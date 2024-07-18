function log(message, ...args) {
  console.log(`[TTS Plugin Content] ${message}`, ...args);
}

function logError(message, ...args) {
  console.error(`[TTS Plugin Content Error] ${message}`, ...args);
  chrome.runtime.sendMessage({action: "logError", error: message});
}

log("Content-Script geladen");

let audioQueue = [];
let currentAudio = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  log("Nachricht empfangen:", request);
  try {
    if (request.action === "getSelectedText") {
      const selectedText = window.getSelection().toString().trim();
      log("Ausgewählter Text:", selectedText);
      sendResponse({text: selectedText});
    } else if (request.action === "playAudio") {
      audioQueue.push({data: request.audioData, isLastChunk: request.isLastChunk});
      if (!currentAudio) {
        playNextAudio();
      }
      sendResponse({success: true});
    } else if (request.action === "showError") {
      showError(request.error);
      sendResponse({success: true});
    }
  } catch (error) {
    logError("Fehler bei der Verarbeitung der Nachricht:", error);
    sendResponse({error: error.message});
  }
  return true; // Wichtig für asynchrone Antworten
});

function playNextAudio() {
  if (audioQueue.length === 0) {
    log("Audio-Warteschlange leer");
    currentAudio = null;
    return;
  }
  
  const {data: audioData, isLastChunk} = audioQueue.shift();
  log("Spiele nächstes Audio ab, verbleibende Elemente:", audioQueue.length);
  currentAudio = new Audio("data:audio/mp3;base64," + audioData);
  
  currentAudio.onended = () => {
    log("Audio-Wiedergabe beendet");
    currentAudio = null;
    if (audioQueue.length > 0) {
      setTimeout(playNextAudio, 50); // Kleine Pause zwischen Chunks
    }
  };
  
  currentAudio.onerror = (error) => {
    logError("Fehler beim Abspielen des Audios:", error);
    showError("Fehler beim Abspielen des Audios: " + error.message);
    currentAudio = null;
    playNextAudio();
  };
  
  currentAudio.play().catch(error => {
    logError("Fehler beim Starten des Audios:", error);
    showError("Fehler beim Starten des Audios: " + error.message);
    currentAudio = null;
    playNextAudio();
  });
}

function showError(message) {
  logError("Fehler:", message);
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
}