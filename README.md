# Text-to-Speech Chrome Extension

This Chrome extension allows you to listen to selected text on web pages using OpenAI's Text-to-Speech API. With a user-friendly interface and advanced control features, it provides an enhanced listening experience right in your browser.

## Features

- **Text-to-Speech Conversion**: Select any text on a webpage and have it read aloud.
- Uses the high-quality OpenAI TTS API for natural speech output.
- **Easy-to-Use**: Simply select text and use the context menu to start listening.
- **Advanced Audio Controls**: 
  - Play/Pause functionality
  - Skip forward and backward by 5 seconds
  - Clickable progress bar for precise navigation
- **Visual Progress Indicator**: See the progress of audio playback in real-time.
- **Multiple Voices**: Choose from various available voices (alloy, echo, fable, onyx, nova, shimmer).
- **Continuous Playback**: Audio pauses at the end instead of stopping, allowing for repeated listening.
- **Download Option**: Save the generated audio as a WAV file for offline listening.
- Efficient processing of text of any length in a single API call.

## Installation

1. Download the plugin source code or clone the repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable "Developer mode" in the top right corner.
4. Click "Load unpacked" and select the folder containing the extension files.

## Configuration

Before you can use the plugin, you need to set up a valid OpenAI API key:

1. Click on the plugin icon in the Chrome toolbar.
2. Enter your OpenAI API key in the input field.
3. Select the desired voice from the dropdown menu.
4. Click on "Save Settings".

## Usage

1. Highlight the text you want to be read aloud.
2. Right-click and select "Read Aloud" from the context menu.
3. The selected text will now be read aloud using the chosen voice.
4. Use the controls at the top of the screen:
   - Play/Pause button to start and pause playback
   - Arrows to skip forward or backward by 5 seconds
   - Click on the progress bar to jump to a specific point
   - Download button to save the audio as a WAV file

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

## Privacy

This extension sends the selected text to the OpenAI API for processing. Please ensure you don't have the extension read aloud any sensitive or personal information without proper consideration.

## Troubleshooting

If you encounter issues, try the following:
- Verify that your API key is entered correctly.
- Make sure you've entered a valid OpenAI API key.
- Check the console in the developer tools for error messages if the plugin isn't working as expected.
- If you experience issues with audio playback, try reloading the page and attempting again.
- Refresh the page and try again.
- Disable and re-enable the extension in `chrome://extensions/`.

## Contributing

Contributions to the project are welcome! Please create an issue or a pull request if you want to suggest improvements or report bugs.

## License

[MIT License](LICENSE)

---

Developed with ❤️ for a better web experience.
