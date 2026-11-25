StudyJug 1.2.2

INSTALL
1. Open chrome://extensions in Chrome.
2. Enable Developer mode.
3. Choose Load unpacked and select this StudyJug folder (unzip first if needed).
4. Pin StudyJug. Reload existing article tabs once after installing/updating.

USE
Create a language pack, expand it, and add words with your own definitions.
Each pack has an independent Underline switch. Multiple packs can be enabled.
Hover over or click an underlined word or focus it and press Enter to reveal definitions.
Escape, outside click, or scrolling closes the definition card.
Words can be edited or deleted. Data stays in Chrome local extension storage.
Existing languages/translation data is migrated on first popup opening; old data is retained.
Quiz mode is visibly reserved for a future release and is disabled.

FILES
manifest.json is Chrome's required manifest name. popup.html, popup.js, popup.css
provide the menu; content.js and styles.css handle web-page underlines.
Icons are icons/studyjug-16.png, studyjug-48.png, studyjug-128.png.

LIMITS
Chrome internal pages, the Web Store, built-in PDF viewer, and other protected
pages cannot be annotated. File URLs require Chrome's Allow access to file URLs.
Matching skips links, code, form controls, editable content, and shadow DOM.
A word/phrase must appear within one text node (phrases split by HTML tags are not matched).
Latin and Arabic terms use Unicode word boundaries; Chinese/Japanese terms can
match within continuous text. Matching is case-insensitive. Very large banks
may slow pages. No quiz is implemented in this version.

PHONETICS
Optional phonetics can be added or edited per word. Settings > Show phonetics in definition controls whether they appear before the definition. Existing entries remain intact. Quiz mode is still coming later.
Update the existing unpacked extension in place to preserve saved words. Reload extension and article tabs. Do not remove/uninstall the old extension.
