# Send to Crosspoint (Obsidian Plugin)

Send your current Obsidian markdown note directly to a Xiaomi Moaan inkPalm Plus / Xteink X4 running **Crosspoint Reader** via Wi-Fi.

## Features

- **One-Click Send**: Quickly send the active note from Obsidian directly to your e-reader.
- **Wi-Fi Upload**: Leverages the local network upload capability of Crosspoint Reader.
- **Configurable Settings**: Specify the IP address, port, and upload path to match your device.

## Prerequisites

- An Obsidian vault.
- An e-reader running [Crosspoint Reader](https://github.com/Xteink/Crosspoint) (e.g., Xiaomi Moaan inkPalm Plus / Xteink X4).
- Both your computer/device running Obsidian and your e-reader must be on the **same Wi-Fi network**.

## Installation

### Method 1: BRAT (Beta Reviewer's Auto-update Tool)

1. Install the [BRAT plugin](https://github.com/TfTHacker/obsidian42-brat) from the Community Plugins in Obsidian.
2. Go to **Settings > BRAT > Add Beta plugin**.
3. Specify this repository's GitHub URL: `xerons/SendToCrosspoint`.
4. Enable the plugin under **Settings > Community plugins**.

### Method 2: Manual Installation

1. Download the latest release (`main.js` and `manifest.json`) from the [Releases page](https://github.com/xerons/SendToCrosspoint/releases).
2. Inside your Obsidian vault, navigate to `.obsidian/plugins/` and create a new folder named `obsidian-crosspoint`.
3. Copy the downloaded files into that new folder.
4. Restart Obsidian or reload the plugins list.
5. Disable "Safe mode" in **Settings > Community plugins**.
6. Toggle ON **Send to Crosspoint**.

## Configuration

Before using the plugin, you must configure it to communicate with your device:

1. Open Obsidian **Settings** and go to the **Send to Crosspoint** plugin tab.
2. **Device IP Address**: Enter the local IP address of your e-reader (e.g., `192.168.1.50`). You can find this on the Crosspoint Web upload screen.
3. **Device Port**: The port for the web interface. (Default: `80`)
4. **Upload Path**: The destination path on the device. (Default: `/`)
5. **Auto-create missing directory**: Automatically create the upload directory on the device if it doesn't exist. (Default: `ON`)

## Usage

1. Open any `.md` file in Obsidian.
2. Open the Command Palette (`Cmd/Ctrl + P`).
3. Type and select: **Send current note to Crosspoint**.
4. You will see a notification confirming the transfer.
5. Open your e-reader's file explorer or Crosspoint Reader to view the newly sent note.

## Development & Building from Source

If you want to modify this plugin, you can build it from source:

1. Clone this repository: `git clone https://github.com/xerons/SendToCrosspoint.git`
2. Run `npm i` or `yarn` to install dependencies.
3. Run `npm run dev` to start compilation in watch mode, or `npm run build` to create a production build.
4. Copy `main.js` and `manifest.json` to a folder in your test vault's `.obsidian/plugins/` directory.

## License

This project is open-source and available under the terms of the MIT License.
