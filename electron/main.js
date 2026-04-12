import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import { SerialPort } from "serialport";
import { ReadlineParser } from "@serialport/parser-readline";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = !app.isPackaged;

let mainWindow = null;
let port = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    kiosk: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    // 🔥 IMPORTANTE: usar ruta absoluta segura en producción
    const indexPath = path.join(__dirname, "..", "dist", "index.html");
    mainWindow.loadFile(indexPath);
  }
}

function setupSerial() {
  port = new SerialPort({
    path: "COM3", // ⚠️ Cambia al puerto correcto
    baudRate: 115200,
    autoOpen: false,
  });

  const parser = port.pipe(new ReadlineParser({ delimiter: "\n" }));

  port.open((err) => {
    if (err) {
      console.error("Error abriendo puerto:", err.message);
      mainWindow?.webContents.send("serial-error", err.message);
      return;
    }
  });

  port.on("open", () => {
    console.log("Puerto abierto");
    mainWindow?.webContents.send("serial-status", "open");
  });

  port.on("close", () => {
    console.log("Puerto cerrado");
    mainWindow?.webContents.send("serial-status", "closed");
  });

  port.on("error", (err) => {
    console.error("Error serial:", err.message);
    mainWindow?.webContents.send("serial-error", err.message);
  });

  parser.on("data", (data) => {
    const received = data
      .toString()
      .replace(/[^\x20-\x7E]/g, "")
      .trim();

    if (!received) return;

    console.log("Mensaje limpio:", received);
    mainWindow?.webContents.send("serial-data", received);
  });
}

ipcMain.on("send-serial", (_, data) => {
  if (port?.isOpen) {
    console.log("Enviando:", data);
    port.write(data + "\n");
  } else {
    console.log("Puerto no disponible");
    mainWindow?.webContents.send("serial-error", "Puerto no abierto");
  }
});

app.whenReady().then(() => {
  createWindow();
  setupSerial();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (port?.isOpen) {
    port.close();
  }
});
