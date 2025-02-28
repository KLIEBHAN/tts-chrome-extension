# Text-to-Speech Chrome Extension

This Chrome extension allows you to listen to selected text on web pages using OpenAI's Text-to-Speech API. With a user-friendly interface and advanced control features, it provides an enhanced listening experience right in your browser.

## Features

- **Text-to-Speech Conversion**: Select any text on a webpage and have it read aloud.
- Uses the high-quality OpenAI TTS API for natural speech output.
- **Easy-to-Use**: Simply select text and use the context menu to start listening.
- **Advanced Audio Controls**: 
  - Play/Pause functionality
  - Skip forward and backward by 5 seconds
  - Clickable progress bar with visual indicator for precise navigation
  - Volume control with mute/unmute option
- **Playback Speed Control**: Adjust the speed of audio playback (0.5x to 2x)
- **Visual Progress Indicator**: See the progress of audio playback in real-time with an interactive progress bar.
- **Time Display**: Shows current playback time and total duration.
- **Multiple Voices**: Choose from various available voices (alloy, echo, fable, onyx, nova, shimmer).
- **Continuous Playback**: Audio pauses at the end instead of stopping, allowing for repeated listening.
- **Download Option**: Save the generated audio as a MP3 file for offline listening.
- Efficient processing of text of any length in a single API call.
- **Modern UI**: 
  - Sleek, semi-transparent player at the top of the page
  - Hover effects for improved user interaction
  - Responsive design that adapts to different screen sizes
- **Error Handling**: Clear error messages with smooth animations for better user feedback.

## Installation

### From Source
1. Clone the repository:
   ```
   git clone https://github.com/KLIEBHAN/tts-chrome-extension.git
   ```
2. Install dependencies:
   ```
   npm install
   ```
3. Build the project:
   ```
   npm run build
   ```
4. Open Chrome and navigate to `chrome://extensions/`.
5. Enable "Developer mode" in the top right corner.
6. Click "Load unpacked" and select the folder containing the extension files.

### From Chrome Web Store
*(Coming soon)*

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
   - Adjust volume using the volume slider
   - Click on the volume icon to mute/unmute
   - Use the speed control dropdown to adjust playback speed
   - Download button to save the audio as a MP3 file
   - Close button to stop playback and remove the player

## Development

To work on this extension:

1. Make changes to the source files.
2. Run `npm run build` to compile Tailwind CSS and other assets.
3. For continuous development, use `npm run watch` to automatically rebuild on file changes.
4. Reload the extension in Chrome to see your changes.

## Technical Details

- The plugin uses Manifest V3 for Chrome extensions.
- It utilizes the OpenAI TTS API for text-to-speech conversion.
- Audio playback is done directly in the browser using the Web Audio API.
- Asynchronous communication between the background script and content script for improved performance and reliability.
- Tailwind CSS is used for styling, providing a modern and responsive design.

## Project Structure

- `manifest.json`: Configuration file for the Chrome extension
- `background.js`: Main plugin logic, handles context menu clicks and API requests
- `content.js`: Interacts with the webpage, handles text selection and audio playback
- `popup.html` and `popup.js`: User interface and logic for plugin settings
- `src/style.css`: Source Tailwind CSS file
- `dist/style.css`: Compiled CSS file (generated from Tailwind)
- `package.json`: Node.js project configuration and scripts

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
- Ensure that you've run `npm run build` after making changes to the Tailwind CSS.

## Contributing

Contributions to the project are welcome! Please create an issue or a pull request on our [GitHub repository](https://github.com/KLIEBHAN/tts-chrome-extension) if you want to suggest improvements or report bugs.

## License

[MIT License](LICENSE)

---

Developed with ❤️ for a better web experience. Visit our [GitHub repository](https://github.com/KLIEBHAN/tts-chrome-extension) for the latest updates and to contribute to the project.