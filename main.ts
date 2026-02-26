import {
  App,
  Editor,
  MarkdownView,
  Modal,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  requestUrl,
} from "obsidian";

interface XteinkSenderSettings {
  deviceIp: string;
  devicePort: string;
  uploadPath: string;
}

const DEFAULT_SETTINGS: XteinkSenderSettings = {
  deviceIp: "",
  devicePort: "80",
  uploadPath: "/",
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

    try {
      // Construct the multipart/form-data payload
      const boundary =
        "----WebKitFormBoundary" + Math.random().toString(36).substring(2);

      // Part 1: File Content
      let body = `--${boundary}\r\n`;
      body += `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n`;
      body += `Content-Type: text/markdown\r\n\r\n`;
      body += content + `\r\n`;
      body += `--${boundary}--\r\n`;

      const port = this.settings.devicePort.trim() || "80";
      let uploadPath = this.settings.uploadPath.trim() || "/";
      if (!uploadPath.startsWith("/")) {
        uploadPath = "/" + uploadPath;
      }

      const url = `http://${ip}:${port}/upload?path=${encodeURIComponent(uploadPath)}`;

      const response = await requestUrl({
        url: url,
        method: "POST",
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
        },
        body: body,
      });

      if (response.status === 200) {
        new Notice(`Successfully sent ${filename} to Crosspoint!`);
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
  }
}
