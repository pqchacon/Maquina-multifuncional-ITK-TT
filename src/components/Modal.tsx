import { forwardRef } from "react";
import NavigateButton from "./Buttons/NavigateButton";

type ModalProps = {
  ruta?: string;
  onConfirm?: () => void;
  mode?: "confirm" | "finished" | "shutdown";
};

const Modal = forwardRef<HTMLDialogElement, ModalProps>(
  ({ ruta = "/", onConfirm, mode = "confirm" }, ref) => {
    const handleShutdown = () => {
      (window as any).api.shutdownSystem();
    };

    return (
      <dialog ref={ref} className="modal">
        <div
          className="modal-box"
          style={{
            backgroundColor: "#14B2D5",
            color: "#000",
          }}
        >
          <h3 className="font-bold text-lg">
            {mode === "finished"
              ? "La prueba ha finalizado"
              : mode === "shutdown"
                ? "¿Desea apagar el sistema?"
                : "¿Desea detener la prueba?"}
          </h3>

          {mode === "shutdown" && (
            <p className="py-2 text-sm">
              El equipo se apagará de forma segura.
            </p>
          )}

          <div className="modal-action">
            {mode === "shutdown" ? (
              <>
                <button
                  className="btn btn-lg font-bold btn-error"
                  onClick={handleShutdown}
                >
                  Apagar
                </button>
                <button
                  className="btn btn-lg font-bold"
                  onClick={() => (ref as any).current?.close()}
                >
                  Cancelar
                </button>
              </>
            ) : (
              <>
                <NavigateButton
                  ruta={ruta}
                  onClickExtra={mode === "confirm" ? onConfirm : undefined}
                >
                  Aceptar
                </NavigateButton>

                {mode === "confirm" && (
                  <button
                    className="btn btn-lg font-bold"
                    onClick={() => (ref as any).current?.close()}
                  >
                    Cancelar
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </dialog>
    );
  },
);

export default Modal;
