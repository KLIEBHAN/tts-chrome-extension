document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('saveKey').addEventListener('click', function() {
    const apiKey = document.getElementById('apiKey').value;
    chrome.storage.local.set({apiKey: apiKey}, function() {
      if (chrome.runtime.lastError) {
        console.error("Fehler beim Speichern des API-Schlüssels:", chrome.runtime.lastError);
      } else {
        console.log("API-Schlüssel gespeichert");
        alert('API-Schlüssel gespeichert!');
      }
    });
  });

  // Zum Testen des Kontextmenüs
  const testButton = document.createElement('button');
  testButton.textContent = 'Kontextmenü testen';
  testButton.addEventListener('click', function() {
    chrome.contextMenus.create({
      id: "testMenu",
      title: "Test-Eintrag",
      contexts: ["all"]
    }, () => {
      if (chrome.runtime.lastError) {
        console.error("Fehler beim Erstellen des Test-Kontextmenüs:", chrome.runtime.lastError);
        alert("Fehler beim Erstellen des Test-Kontextmenüs. Siehe Konsole für Details.");
      } else {
        console.log("Test-Kontextmenü erfolgreich erstellt");
        alert("Test-Kontextmenü erfolgreich erstellt. Bitte überprüfen Sie das Kontextmenü auf einer Webseite.");
      }
    });
  });
  document.body.appendChild(testButton);
});