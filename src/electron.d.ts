export {};

declare global {
  interface Window {
    api: {
      sendSerial: (data: string) => void;

      // 🔥 Ahora retornan función de cleanup
      onSerialData: (callback: (data: string) => void) => () => void;
      onSerialError: (callback: (error: string) => void) => () => void;
      onSerialStatus: (callback: (status: string) => void) => () => void;
    };
  }
}