# Chrome TTS Plugin with OpenAI API

## Overview

This Chrome plugin allows users to have selected text on web pages read aloud using the OpenAI Text-to-Speech (TTS) API. It provides a convenient way to convert text content into natural-sounding speech.

## Features

- Select any text on a webpage and have it read aloud.
- Uses the high-quality OpenAI TTS API for natural speech output.
- Easy integration with Chrome's context menu.
- Support for various voices (alloy, echo, fable, onyx, nova, shimmer).
- Efficient processing of text of any length in a single API call.

## Installation

1. Download the plugin source code or clone the repository.
2. Open Google Chrome and navigate to `chrome://extensions`.
3. Enable "Developer mode" in the top right corner.
4. Click on "Load unpacked extension".
5. Select the folder containing the plugin source code.

## Configuration

Before you can use the plugin, you need to set up a valid OpenAI API key:

1. Click on the plugin icon in the Chrome toolbar.
2. Enter your OpenAI API key in the input field.
3. Select the desired voice from the dropdown menu.
4. Click on "Save Settings".

## Usage

1. Select the text on a webpage that you want to have read aloud.
2. Right-click on the selected text.
3. Choose "Read Aloud" from the context menu.
4. The selected text will now be read aloud using the chosen voice.

## Technical Details

- The plugin uses Manifest V3 for Chrome extensions.
- It utilizes the OpenAI TTS API for text-to-speech conversion.
- Audio playback is done directly in the browser using the Web Audio API.
- Asynchronous communication between the background script and content script for improved performance and reliability.

## Project Structure

- `manifest.json`: Configuration file for the Chrome extension
- `background.js`: Main plugin logic, handles context menu clicks and API requests
- `content.js`: Interacts with the webpage, handles text selection and audio playback
- `popup.html` and `popup.js`: User interface and logic for plugin settings

## Troubleshooting

- Make sure you've entered a valid OpenAI API key.
- Check the console in the developer tools for error messages if the plugin isn't working as expected.
- If you experience issues with audio playback, try reloading the page and attempting again.

## Privacy and Security

- Your OpenAI API key is stored locally in your browser and is not shared with any third parties.
- The text to be processed is only sent to the OpenAI API and is not stored anywhere else.
- Audio data is processed directly in the browser and is not persistently stored.

## Contributing

Contributions to the project are welcome! Please create an issue or a pull request if you want to suggest improvements or report bugs.

## License

[MIT License](LICENSE)

---

Developed with ❤️ and OpenAI's TTS API
