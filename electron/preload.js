const { contextBridge, ipcRenderer } = require("electron");

// Canales permitidos
const validSendChannels = ["send-serial"];
const validReceiveChannels = ["serial-data", "serial-error", "serial-status"];

contextBridge.exposeInMainWorld("api", {
  // Enviar datos al puerto serial
  sendSerial: (data) => {
    if (validSendChannels.includes("send-serial")) {
      ipcRenderer.send("send-serial", data);
    }
  },

  // Escuchar datos del serial (con cleanup)
  onSerialData: (callback) => {
    if (!validReceiveChannels.includes("serial-data")) return;

    const listener = (_event, data) => {
      callback(data);
    };

    ipcRenderer.on("serial-data", listener);

    // 🔥 Devuelve función para remover listener
    return () => {
      ipcRenderer.removeListener("serial-data", listener);
    };
  },

  // Escuchar errores
  onSerialError: (callback) => {
    if (!validReceiveChannels.includes("serial-error")) return;

    const listener = (_event, error) => {
      callback(error);
    };

    ipcRenderer.on("serial-error", listener);

    return () => {
      ipcRenderer.removeListener("serial-error", listener);
    };
  },

  // Escuchar estado
  onSerialStatus: (callback) => {
    if (!validReceiveChannels.includes("serial-status")) return;

    const listener = (_event, status) => {
      callback(status);
    };

    ipcRenderer.on("serial-status", listener);

    return () => {
      ipcRenderer.removeListener("serial-status", listener);
    };
  },
});
