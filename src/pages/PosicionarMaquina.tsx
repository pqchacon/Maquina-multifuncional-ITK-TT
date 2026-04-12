import { useState, useRef, useEffect, useContext } from "react";
import { temaOscuro, ThemeContext } from "../App";
import Navbar from "../components/Navbar";
import Card from "../components/Card";
import ActionButton from "../components/Buttons/ActionButton";
import {
  IoIosArrowBack,
  IoIosArrowForward,
  IoIosArrowUp,
  IoIosArrowDown,
} from "react-icons/io";
import FondoIntertekClaro from "../assets/FondoIntertekClaro.jpg";
import FondoIntertekOscuro from "../assets/FondoIntertekOscuro.jpg";

function PosicionarMaquina() {
  const { theme } = useContext(ThemeContext);

  const [activeButton, setActiveButton] = useState<string | null>(null);
  const activePointerId = useRef<number | null>(null);

  const sendJSON = (data: object) => {
    window.api.sendSerial(JSON.stringify(data));
  };

  // Mapeo profesional
  const commandMap: Record<string, { motor: number; direccion: string }> = {
    moverTorreIzquierda: { motor: 1, direccion: "left" },
    moverTorreDerecha: { motor: 1, direccion: "right" },
    moverMesaArriba: { motor: 2, direccion: "up" },
    moverMesaAbajo: { motor: 2, direccion: "down" },
  };

  const stopMotor = (name: string) => {
    const config = commandMap[name];

    if (config) {
      sendJSON({
        motor: config.motor,
        accion: "stop",
      });
    }

    setActiveButton(null);
    activePointerId.current = null;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    const { name } = e.currentTarget;

    // 🚫 Anti multi-touch
    if (activeButton !== null) return;

    const config = commandMap[name];

    if (config) {
      sendJSON({
        motor: config.motor,
        accion: "move",
        direccion: config.direccion,
      });
    }

    activePointerId.current = e.pointerId;
    setActiveButton(name);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (activeButton && activePointerId.current === e.pointerId) {
      stopMotor(activeButton);
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const handlePointerCancel = () => {
    if (activeButton) stopMotor(activeButton);
  };

  const handlePointerLeave = () => {
    if (activeButton) stopMotor(activeButton);
  };

  // 🛡 Seguridad global
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (activeButton) stopMotor(activeButton);
    };

    window.addEventListener("pointerup", handleGlobalPointerUp);
    window.addEventListener("pointercancel", handleGlobalPointerUp);

    return () => {
      window.removeEventListener("pointerup", handleGlobalPointerUp);
      window.removeEventListener("pointercancel", handleGlobalPointerUp);
    };
  }, [activeButton]);

  return (
    <>
      <Navbar ruta="/">Posicionar Máquina</Navbar>

      <main className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center">
        {/* Imagen de fondo */}
        <div
          className="absolute inset-0 bg-cover bg-[position:78%_15%]"
          style={
            theme === temaOscuro
              ? { backgroundImage: `url(${FondoIntertekOscuro})` }
              : { backgroundImage: `url(${FondoIntertekClaro})` }
          }
        />

        {/* Overlay oscuro */}
        <div className="absolute inset-0 bg-black/50" />

        <div className="flex flex-col items-center gap-10">
          <Card>
            {/* TORRE */}
            <section className="flex flex-col items-center gap-8">
              <div className="badge badge-warning text-xl">
                Posicionar Torre
              </div>

              <div className="flex gap-30">
                <ActionButton
                  name="moverTorreIzquierda"
                  disabled={
                    activeButton !== null &&
                    activeButton !== "moverTorreIzquierda"
                  }
                  onPointerDown={handlePointerDown}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerCancel}
                  onPointerLeave={handlePointerLeave}
                >
                  <IoIosArrowBack size={28} />
                </ActionButton>

                <ActionButton
                  name="moverTorreDerecha"
                  disabled={
                    activeButton !== null &&
                    activeButton !== "moverTorreDerecha"
                  }
                  onPointerDown={handlePointerDown}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerCancel}
                  onPointerLeave={handlePointerLeave}
                >
                  <IoIosArrowForward size={28} />
                </ActionButton>
              </div>
            </section>

            <div className="divider "></div>

            {/* MESA */}
            <section className="flex flex-col items-center gap-8">
              <div className="badge badge-warning text-xl">Posicionar Mesa</div>

              <div className="flex gap-30">
                <ActionButton
                  name="moverMesaArriba"
                  disabled={
                    activeButton !== null && activeButton !== "moverMesaArriba"
                  }
                  onPointerDown={handlePointerDown}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerCancel}
                  onPointerLeave={handlePointerLeave}
                >
                  <IoIosArrowUp size={28} />
                </ActionButton>

                <ActionButton
                  name="moverMesaAbajo"
                  disabled={
                    activeButton !== null && activeButton !== "moverMesaAbajo"
                  }
                  onPointerDown={handlePointerDown}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerCancel}
                  onPointerLeave={handlePointerLeave}
                >
                  <IoIosArrowDown size={28} />
                </ActionButton>
              </div>
            </section>
          </Card>
        </div>
      </main>
    </>
  );
}

export default PosicionarMaquina;
