import { saveQuietly } from "./quiet-save";
import { workerSaveDeps } from "./worker-save";

// Added as the worker starts, like the side panel command's, or the event that woke it is lost.
chrome.commands.onCommand.addListener((command, tab) => {
  void saveQuietly(command, tab, workerSaveDeps);
});
