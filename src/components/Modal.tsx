import { forwardRef } from "react";
import NavigateButton from "./Buttons/NavigateButton";

type ModalProps = {
  ruta: string;
  onConfirm?: () => void;
  mode?: "confirm" | "finished";
};

const Modal = forwardRef<HTMLDialogElement, ModalProps>(
  ({ ruta, onConfirm, mode = "confirm" }, ref) => {
    return (
      <dialog ref={ref} className="modal">
        <div
          className="modal-box"
          style={{
            backgroundColor: "#14B2D5", // ← COLOR QUE TÚ QUIERAS
            color: "#000", // ← COLOR DEL TEXTO
          }}
        >
          <h3 className="font-bold text-lg">
            {mode === "finished"
              ? "La prueba ha finalizado"
              : "¿Desea detener la prueba?"}
          </h3>

          <div className="modal-action">
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
          </div>
        </div>
      </dialog>
    );
  },
);

export default Modal;
