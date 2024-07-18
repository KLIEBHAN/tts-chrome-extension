# Chrome TTS Plugin mit OpenAI API

## Übersicht

Dieses Chrome-Plugin ermöglicht es Benutzern, markierten Text auf Webseiten mithilfe der OpenAI Text-to-Speech (TTS) API vorlesen zu lassen. Es bietet eine bequeme Möglichkeit, Textinhalte in natürlich klingende Sprache umzuwandeln.

## Funktionen

- Markieren Sie beliebigen Text auf einer Webseite und lassen Sie ihn vorlesen.
- Verwendet die hochwertige OpenAI TTS API für natürliche Sprachausgabe.
- Einfache Integration in das Kontextmenü von Chrome.
- Verarbeitet auch längere Texte durch Aufteilung in kleinere Chunks.

## Installation

1. Laden Sie den Quellcode des Plugins herunter oder klonen Sie das Repository.
2. Öffnen Sie Google Chrome und navigieren Sie zu `chrome://extensions`.
3. Aktivieren Sie den "Entwicklermodus" in der oberen rechten Ecke.
4. Klicken Sie auf "Entpackte Erweiterung laden".
5. Wählen Sie den Ordner aus, der den Quellcode des Plugins enthält.

## Konfiguration

Bevor Sie das Plugin verwenden können, müssen Sie einen gültigen OpenAI API-Schlüssel einrichten:

1. Klicken Sie auf das Plugin-Icon in der Chrome-Toolbar.
2. Geben Sie Ihren OpenAI API-Schlüssel in das Eingabefeld ein.
3. Klicken Sie auf "API-Schlüssel speichern".

## Verwendung

1. Markieren Sie den Text auf einer Webseite, den Sie vorlesen lassen möchten.
2. Klicken Sie mit der rechten Maustaste auf den markierten Text.
3. Wählen Sie "Vorlesen" aus dem Kontextmenü.
4. Der markierte Text wird nun vorgelesen.

## Technische Details

- Das Plugin verwendet Manifest V3 für Chrome-Erweiterungen.
- Es teilt längere Texte in Chunks von maximal 50 Zeichen auf, um Browser-Limitierungen zu umgehen.
- Die Audio-Wiedergabe erfolgt sequenziell, um eine flüssige und verständliche Ausgabe zu gewährleisten.

## Fehlerbehebung

- Stellen Sie sicher, dass Sie einen gültigen OpenAI API-Schlüssel eingegeben haben.
- Überprüfen Sie die Konsole in den Entwickler-Tools auf Fehlermeldungen, falls das Plugin nicht wie erwartet funktioniert.
- Bei Problemen mit der Audio-Wiedergabe versuchen Sie, die Seite neu zu laden und es erneut zu versuchen.

## Datenschutz und Sicherheit

- Ihr OpenAI API-Schlüssel wird lokal in Ihrem Browser gespeichert und nicht an Dritte weitergegeben.
- Der zu verarbeitende Text wird nur an die OpenAI API gesendet und nirgendwo sonst gespeichert.

## Beitrag

Beiträge zum Projekt sind willkommen! Bitte erstellen Sie ein Issue oder einen Pull Request, wenn Sie Verbesserungen vorschlagen oder Fehler melden möchten.

## Lizenz

[Fügen Sie hier Ihre gewählte Lizenz ein, z.B. MIT, GPL, etc.]

---

Entwickelt mit ❤️ und OpenAI's TTS API