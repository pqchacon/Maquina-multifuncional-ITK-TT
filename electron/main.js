import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";
import { SerialPort } from "serialport";
import { ReadlineParser } from "@serialport/parser-readline";
import { io } from "socket.io-client";

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

  messageQueue.forEach((msg) => {
    mainWindow?.webContents.send("serial-data", msg);
  });
  messageQueue = [];
});

// ===============================
// Apagar el sistema (Windows o Linux)
// ===============================
ipcMain.on("shutdown-system", () => {
  const command = isWindows ? "shutdown /s /t 5" : "sudo shutdown -h now";
  console.log("[MAIN] Apagando sistema con comando:", command);

  // Cerrar puerto serial limpiamente antes de apagar
  if (port?.isOpen) {
    port.close();
  }
  if (socket?.connected) {
    socket.disconnect();
  }

  exec(command, (err) => {
    if (err) console.error("[MAIN] Error al apagar:", err.message);
  });
});

// ===============================
// Cliente Socket.IO
// ===============================

const SERVIDOR_URL = "http://192.168.120.56:5000";

let socket = null;

function setupSocketIO() {
  socket = io(SERVIDOR_URL, {
    reconnection: true,
    reconnectionDelay: 3000,
    reconnectionAttempts: Infinity,
  });

  socket.on("connect", () => {
    console.log("[SOCKET] Conectado al servidor:", SERVIDOR_URL);
  });

  socket.on("disconnect", (reason) => {
    console.log("[SOCKET] Desconectado del servidor:", reason);
  });

  socket.on("connect_error", (err) => {
    console.error("[SOCKET] Error de conexion:", err.message);
  });

  // -------------------------------------------------------
  // SERVIDOR → RASPBERRY
  // El servidor reenvía comandos que mandó la app móvil.
  // La Raspberry los escribe al serial para que los ejecute la ESP32.
  // -------------------------------------------------------
  socket.on("mensajeMultifuncional", (data) => {
    console.log("[SOCKET] Comando recibido del servidor:", data);

    const comando = data?.mensaje ?? data;

    if (!comando) return;

    const jsonString = JSON.stringify(comando);

    // Escribir al serial (va a la ESP32)
    if (port?.isOpen) {
      console.log("[SERIAL] Enviando a ESP32:", jsonString);
      port.write(jsonString + "\n");
    } else {
      console.warn(
        "[SERIAL] Puerto no disponible, comando descartado:",
        jsonString,
      );
    }

    // También actualizar la UI local de Electron
    if (rendererReady) {
      mainWindow?.webContents.send("serial-data", jsonString);
    }
  });
}

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

  // Resetear rendererReady cada vez que se recarga la ventana
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

    if (!isWindows) {
      const preferred =
        ports.find((p) => p.path.includes("ttyUSB")) ||
        ports.find((p) => p.path.includes("ttyACM")) ||
        ports[0];

      return preferred.path;
    }

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

    // Canal 1: UI local de Electron
    if (rendererReady) {
      mainWindow?.webContents.send("serial-data", received);
    } else {
      console.log("[MAIN] Renderer no listo, encolando:", received);
      messageQueue.push(received);
    }

    // Canal 2: Servidor Socket.IO
    // Solo reenviar mensajes JSON válidos de motor 3
    // (posición, config, cycle, finished)
    try {
      const parsed = JSON.parse(received);

      if (parsed.motor === 3 && socket?.connected) {
        console.log("[SOCKET] Enviando al servidor:", parsed);
        socket.emit("datos_espMultifuncional", parsed);
      }
    } catch (_) {
      // Mensajes de texto plano como "Prueba terminada manualmente" — ignorar para socket
    }
  });
}

// ===============================
// Enviar datos al serial desde la UI local
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
  setupSocketIO();

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

  if (socket?.connected) {
    socket.disconnect();
  }
});
