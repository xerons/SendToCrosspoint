import {
  App,
  Editor,
  MarkdownView,
  MarkdownRenderer,
  Modal,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  requestUrl,
} from "obsidian";
import { generateEpubBuffer } from "./epub";

interface XteinkSenderSettings {
  deviceIp: string;
  devicePort: string;
  uploadPath: string;
  autoCreateDir: boolean;
  convertToEpub: boolean;
}

const DEFAULT_SETTINGS: XteinkSenderSettings = {
  deviceIp: "",
  devicePort: "80",
  uploadPath: "/",
  autoCreateDir: true,
  convertToEpub: false,
};

export default class XteinkSenderPlugin extends Plugin {
  settings: XteinkSenderSettings;

  async onload() {
    await this.loadSettings();

    // This adds a simple command that can be triggered anywhere
    this.addCommand({
      id: "send-current-note-to-crosspoint",
      name: "Send current note to Crosspoint",
      checkCallback: (checking: boolean) => {
        // Conditions to check
        const markdownView =
          this.app.workspace.getActiveViewOfType(MarkdownView);
        if (markdownView) {
          // If checking is true, we're simply "checking" if the command can be run.
          // If checking is false, then we want to actually perform the operation.
          if (!checking) {
            this.sendNoteToDevice(markdownView);
          }

          // This command will only show up in Command Palette when the check function returns true
          return true;
        }
        return false;
      },
    });

    // This adds a settings tab so the user can configure various aspects of the plugin
    this.addSettingTab(new XteinkSenderSettingTab(this.app, this));
  }

  onunload() {}

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async sendNoteToDevice(view: MarkdownView) {
    const ip = this.settings.deviceIp.trim();
    if (!ip) {
      new Notice(
        "Please configure your device IP address in the plugin settings.",
      );
      return;
    }

    const file = view.file;
    if (!file) {
      new Notice("No active file found.");
      return;
    }

    const content = view.getViewData();
    const filename = file.name;

    new Notice(`Sending ${filename} to Crosspoint...`);

    let fileBuffer: ArrayBuffer | null = null;
    let exportFilename = filename;
    let contentType = "text/markdown";

    if (this.settings.convertToEpub) {
      new Notice(`Converting ${filename} to EPUB...`);
      exportFilename = filename.replace(/\.md$/i, "") + ".epub";
      contentType = "application/epub+zip";
      
      try {
        fileBuffer = await generateEpubBuffer(content, filename);
      } catch (e) {
        console.error("EPUB conversion error:", e);
        new Notice("Failed to convert to EPUB. Sending as markdown instead.");
        fileBuffer = new TextEncoder().encode(content).buffer;
      }
    } else {
      fileBuffer = new TextEncoder().encode(content).buffer;
    }

    try {
      if (!fileBuffer) {
        throw new Error("Failed to create file buffer.");
      }

      // Construct the multipart/form-data payload manually to pass arrayBuffer
      const boundary = "----WebKitFormBoundary" + Math.random().toString(36).substring(2);

      // Part 1: File Content Header
      let headerStr = `--${boundary}\r\n`;
      headerStr += `Content-Disposition: form-data; name="file"; filename="${exportFilename}"\r\n`;
      headerStr += `Content-Type: ${contentType}\r\n\r\n`;
      
      const headerBuffer = new TextEncoder().encode(headerStr).buffer;
      
      const footerStr = `\r\n--${boundary}--\r\n`;
      const footerBuffer = new TextEncoder().encode(footerStr).buffer;
      
      // Combine body buffers
      const totalLength = headerBuffer.byteLength + fileBuffer.byteLength + footerBuffer.byteLength;
      const combinedBody = new Uint8Array(totalLength);
      combinedBody.set(new Uint8Array(headerBuffer), 0);
      combinedBody.set(new Uint8Array(fileBuffer), headerBuffer.byteLength);
      combinedBody.set(new Uint8Array(footerBuffer), headerBuffer.byteLength + fileBuffer.byteLength);

      const port = this.settings.devicePort.trim() || "80";
      let uploadPath = this.settings.uploadPath.trim() || "/";
      if (!uploadPath.startsWith("/")) {
        uploadPath = "/" + uploadPath;
      }

      if (this.settings.autoCreateDir && uploadPath !== "/") {
        const segments = uploadPath.split("/").filter(s => s.length > 0);
        let currentPath = "/";

        for (const segment of segments) {
          try {
            const mkdirUrl = `http://${ip}:${port}/mkdir?path=${encodeURIComponent(currentPath)}&name=${encodeURIComponent(segment)}`;
            await requestUrl({ url: mkdirUrl, method: "POST" });
          } catch (e) {
            console.debug(`Folder creation for ${segment} at ${currentPath} failed or already exists.`);
          }
          currentPath = currentPath === "/" ? `/${segment}` : `${currentPath}/${segment}`;
        }
      }

      const url = `http://${ip}:${port}/upload?path=${encodeURIComponent(uploadPath)}`;

      const response = await requestUrl({
        url: url,
        method: "POST",
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
        },
        body: combinedBody.buffer,
      });

      if (response.status === 200) {
        new Notice(`Successfully sent ${exportFilename} to Crosspoint!`);
      } else {
        throw new Error(
          `Device responded with status: ${response.status}. ${response.text}`,
        );
      }
    } catch (error) {
      			console.error('Error sending note to Crosspoint:', error);
      new Notice(`Failed to send note: ${error.message || error}`);
    }
  }
}

class XteinkSenderSettingTab extends PluginSettingTab {
  plugin: XteinkSenderPlugin;

  constructor(app: App, plugin: XteinkSenderPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    containerEl.createEl("h3", { text: `Settings for Send to Crosspoint (v${this.plugin.manifest.version})` });

    new Setting(containerEl)
      .setName("Device IP Address")
      .setDesc(
        "The IP address of your device on the local Wi-Fi network (e.g., 192.168.1.50). Check the Crosspoint Reader Web UI settings or your router.",
      )
      .addText((text) =>
        text
          .setPlaceholder("192.168.1.50")
          .setValue(this.plugin.settings.deviceIp)
          .onChange(async (value) => {
            this.plugin.settings.deviceIp = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Device Port")
      .setDesc(
        "The port the Crosspoint Reader web server is running on (default is 80).",
      )
      .addText((text) =>
        text
          .setPlaceholder("80")
          .setValue(this.plugin.settings.devicePort)
          .onChange(async (value) => {
            this.plugin.settings.devicePort = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Upload Path")
      .setDesc(
        "The directory on the device where notes will be saved (default is /).",
      )
      .addText((text) =>
        text
          .setPlaceholder("/")
          .setValue(this.plugin.settings.uploadPath)
          .onChange(async (value) => {
            this.plugin.settings.uploadPath = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Auto-create missing directory")
      .setDesc("Automatically create the upload directory on the device if it doesn't exist.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.autoCreateDir)
          .onChange(async (value) => {
            this.plugin.settings.autoCreateDir = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Convert to EPUB")
      .setDesc("Convert the markdown file to an EPUB book before sending to Crosspoint.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.convertToEpub)
          .onChange(async (value) => {
            this.plugin.settings.convertToEpub = value;
            await this.plugin.saveSettings();
          }),
      );
  }
}
