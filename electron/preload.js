const { contextBridge, ipcRenderer } = require("electron");

// Canales permitidos
const validSendChannels = ["send-serial", "renderer-ready"];
const validReceiveChannels = ["serial-data", "serial-error", "serial-status"];

contextBridge.exposeInMainWorld("api", {
  // ===============================
  // Enviar datos al puerto serial
  // ===============================
  sendSerial: (data) => {
    const channel = "send-serial";
    if (validSendChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },

  // ===============================
  // Avisar al main que el renderer está listo para recibir mensajes
  // ===============================
  rendererReady: () => {
    ipcRenderer.send("renderer-ready");
  },

  // ===============================
  // Escuchar datos del serial
  // ===============================
  onSerialData: (callback) => {
    const channel = "serial-data";
    if (!validReceiveChannels.includes(channel)) return;

    // Registrar listener individual y devolver función de limpieza
    const listener = (_event, data) => callback(data);
    ipcRenderer.on(channel, listener);

    return () => {
      ipcRenderer.removeListener(channel, listener);
    };
  },

  // ===============================
  // Escuchar errores
  // ===============================
  onSerialError: (callback) => {
    const channel = "serial-error";
    if (!validReceiveChannels.includes(channel)) return;

    const listener = (_event, error) => callback(error);
    ipcRenderer.on(channel, listener);

    return () => {
      ipcRenderer.removeListener(channel, listener);
    };
  },

  // ===============================
  // Escuchar estado del puerto
  // ===============================
  onSerialStatus: (callback) => {
    const channel = "serial-status";
    if (!validReceiveChannels.includes(channel)) return;

    const listener = (_event, status) => callback(status);
    ipcRenderer.on(channel, listener);

    return () => {
      ipcRenderer.removeListener(channel, listener);
    };
  },
});
