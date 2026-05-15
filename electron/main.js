import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import { SerialPort } from "serialport";
import { ReadlineParser } from "@serialport/parser-readline";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = !app.isPackaged;
const isWindows = process.platform === "win32";

let mainWindow = null;
let port = null;
let parser = null;

// ===============================
// Cola de mensajes hasta que el renderer esté listo
// ===============================
let rendererReady = false;
let messageQueue = [];

ipcMain.on("renderer-ready", () => {
  rendererReady = true;
  console.log(
    "[MAIN] Renderer listo, enviando cola:",
    messageQueue.length,
    "mensajes",
  );

  // Enviar todos los mensajes que llegaron antes de que el renderer estuviera listo
  messageQueue.forEach((msg) => {
    mainWindow?.webContents.send("serial-data", msg);
  });
  messageQueue = [];
});

// ===============================
// Crear ventana
// ===============================
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

  // Resetear rendererReady cada vez que se crea o recarga la ventana
  mainWindow.webContents.on("did-start-loading", () => {
    rendererReady = false;
    messageQueue = [];
    console.log("[MAIN] Ventana recargando, renderer marcado como no listo");
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(__dirname, "..", "dist", "index.html");
    mainWindow.loadFile(indexPath);
  }
}

// ===============================
// Detectar puerto automáticamente
// ===============================
async function getSerialPath() {
  try {
    const ports = await SerialPort.list();
    console.log("Puertos disponibles:", ports);

    if (!ports.length) return null;

    // 🔹 Prioridad Linux (Raspberry)
    if (!isWindows) {
      const preferred =
        ports.find((p) => p.path.includes("ttyUSB")) ||
        ports.find((p) => p.path.includes("ttyACM")) ||
        ports[0];

      return preferred.path;
    }

    // 🔹 Windows
    return ports[0].path;
  } catch (error) {
    console.error("Error listando puertos:", error);
    return null;
  }
}

// ===============================
// Configurar puerto serial
// ===============================
async function setupSerial() {
  const serialPath = await getSerialPath();

  if (!serialPath) {
    console.error("No se encontro puerto serial");
    mainWindow?.webContents.send(
      "serial-error",
      "No se encontró puerto serial",
    );

    setTimeout(setupSerial, 3000);
    return;
  }

  console.log("Usando puerto:", serialPath);

  port = new SerialPort({
    path: serialPath,
    baudRate: 115200,
    autoOpen: false,
  });

  parser = port.pipe(new ReadlineParser({ delimiter: "\n" }));

  port.open((err) => {
    if (err) {
      console.error("Error abriendo puerto:", err.message);
      mainWindow?.webContents.send("serial-error", err.message);

      setTimeout(setupSerial, 3000);
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

    // 🔁 Reconexión automática
    setTimeout(setupSerial, 3000);
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

    console.log(`[SERIAL RAW] ${Date.now()} → ${received}`);

    // ✅ Si el renderer no está listo, encolar el mensaje en lugar de perderlo
    if (rendererReady) {
      mainWindow?.webContents.send("serial-data", received);
    } else {
      console.log("[MAIN] Renderer no listo, encolando:", received);
      messageQueue.push(received);
    }
  });
}

// ===============================
// Enviar datos al serial
// ===============================
ipcMain.on("send-serial", (_, data) => {
  if (port?.isOpen) {
    console.log("Enviando:", data);
    port.write(data + "\n");
  } else {
    console.log("Puerto no disponible");
    mainWindow?.webContents.send("serial-error", "Puerto no abierto");
  }
});

// ===============================
// Ciclo de vida de Electron
// ===============================
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
