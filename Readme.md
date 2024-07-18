# Chrome TTS Plugin mit OpenAI API

## Übersicht

Dieses Chrome-Plugin ermöglicht es Benutzern, markierten Text auf Webseiten mithilfe der OpenAI Text-to-Speech (TTS) API vorlesen zu lassen. Es bietet eine bequeme Möglichkeit, Textinhalte in natürlich klingende Sprache umzuwandeln.

## Funktionen

- Markieren Sie beliebigen Text auf einer Webseite und lassen Sie ihn vorlesen.
- Verwendet die hochwertige OpenAI TTS API für natürliche Sprachausgabe.
- Einfache Integration in das Kontextmenü von Chrome.
- Unterstützung für verschiedene Stimmen (alloy, echo, fable, onyx, nova, shimmer).
- Effiziente Verarbeitung von Text jeder Länge in einem einzigen API-Aufruf.

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
3. Wählen Sie die gewünschte Stimme aus dem Dropdown-Menü.
4. Klicken Sie auf "Einstellungen speichern".

## Verwendung

1. Markieren Sie den Text auf einer Webseite, den Sie vorlesen lassen möchten.
2. Klicken Sie mit der rechten Maustaste auf den markierten Text.
3. Wählen Sie "Vorlesen" aus dem Kontextmenü.
4. Der markierte Text wird nun mit der ausgewählten Stimme vorgelesen.

## Technische Details

- Das Plugin verwendet Manifest V3 für Chrome-Erweiterungen.
- Es nutzt die OpenAI TTS API für die Umwandlung von Text in Sprache.
- Die Audio-Wiedergabe erfolgt direkt im Browser mithilfe der Web Audio API.
- Asynchrone Kommunikation zwischen Background Script und Content Script für verbesserte Leistung und Zuverlässigkeit.

## Fehlerbehebung

- Stellen Sie sicher, dass Sie einen gültigen OpenAI API-Schlüssel eingegeben haben.
- Überprüfen Sie die Konsole in den Entwickler-Tools auf Fehlermeldungen, falls das Plugin nicht wie erwartet funktioniert.
- Bei Problemen mit der Audio-Wiedergabe versuchen Sie, die Seite neu zu laden und es erneut zu versuchen.
- Wenn Sie den Fehler "The message port closed before a response was received" erhalten, ist dies normal und beeinträchtigt die Funktionalität des Plugins nicht.

## Datenschutz und Sicherheit

- Ihr OpenAI API-Schlüssel wird lokal in Ihrem Browser gespeichert und nicht an Dritte weitergegeben.
- Der zu verarbeitende Text wird nur an die OpenAI API gesendet und nirgendwo sonst gespeichert.
- Die Audio-Daten werden direkt im Browser verarbeitet und nicht persistent gespeichert.

## Beitrag

Beiträge zum Projekt sind willkommen! Bitte erstellen Sie ein Issue oder einen Pull Request, wenn Sie Verbesserungen vorschlagen oder Fehler melden möchten.

## Lizenz

[Fügen Sie hier Ihre gewählte Lizenz ein, z.B. MIT, GPL, etc.]

---

Entwickelt mit ❤️ und OpenAI's TTS API
