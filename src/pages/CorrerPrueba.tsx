import { useState, useRef, useEffect, useContext } from "react";
import { temaOscuro, ThemeContext } from "../App";
import { useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";
import BarProgress from "../components/BarProgress";
import RadialProgress from "../components/RadialProgress";
import Output from "../components/Output";
import ActionButton from "../components/Buttons/ActionButton";
import Modal from "../components/Modal";
import Card from "../components/Card";
import { FaPause, FaPlay } from "react-icons/fa6";
import FondoIntertekClaro from "../assets/FondoIntertekClaro.jpg";
import FondoIntertekOscuro from "../assets/FondoIntertekOscuro.jpg";

function CorrerPrueba() {
  const { theme } = useContext(ThemeContext);

  // Estado visual del botón (para re-render del UI)
  const [isPaused, setIsPaused] = useState(false);
  const [ciclosCompletados, setCiclosCompletados] = useState(0);
  const [testFinished, setTestFinished] = useState(false);
  const [tiempoEstimado, setTiempoEstimado] = useState(0);
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState(0);
  const [progreso, setProgreso] = useState(0);

  // Refs para control interno del timer (no disparan re-renders ni re-montan efectos)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inicioRef = useRef<number | null>(null);
  const tiempoPausaRef = useRef<number>(0);
  const isPausedRef = useRef<boolean>(false);

  const dialogRef = useRef<HTMLDialogElement>(null);

  const location = useLocation();
  const ciclos = location.state?.sendDato ?? 0;

  // EFECTO 1 — Registrar listener serial y avisar al main que el renderer está listo
  useEffect(() => {
    const handleSerialData = (data: string) => {
      console.log(`[RENDERER] ${Date.now()} → ${data}`);
      try {
        const parsed = JSON.parse(data);

        if (parsed.motor === 3) {
          console.log(`[PARSED] estado=${parsed.estado}`, parsed);

          if (parsed.estado === "cycle") {
            setCiclosCompletados(parsed.ciclos);
          }

          if (parsed.estado === "finished") {
            setTestFinished(true);
            dialogRef.current?.showModal();
          }

          if (parsed.estado === "config") {
            console.log(`[CONFIG] tiempoEstimado=${parsed.tiempoEstimado}`);

            // Resetear todo el estado de la prueba
            setTiempoEstimado(parsed.tiempoEstimado);
            setTiempoTranscurrido(0);
            setProgreso(0);
            setTestFinished(false);
            setIsPaused(false);

            // Resetear refs de control
            isPausedRef.current = false;
            tiempoPausaRef.current = 0;
            inicioRef.current = Date.now();
          }
        }
      } catch (error) {
        console.error("Error parseando JSON:", error, "| Data recibida:", data);
      }
    };

    // Registrar el listener serial
    const cleanup = window.api.onSerialData(handleSerialData);

    // ✅ Avisar al main que este componente ya está montado y escuchando.
    // El main enviará cualquier mensaje que haya llegado antes de este punto.
    window.api.rendererReady();
    console.log("[RENDERER] Listo, avisando al main");

    return () => {
      cleanup?.();
    };
  }, []);

  // EFECTO 2 — Crea y mantiene el intervalo durante toda la prueba.
  // Solo depende de tiempoEstimado para no reiniciarse por cambios de pausa o testFinished.
  useEffect(() => {
    if (tiempoEstimado <= 0) return;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      if (isPausedRef.current) return;
      if (!inicioRef.current) return;

      const segundosReales = (Date.now() - inicioRef.current) / 1000;

      setTiempoTranscurrido(segundosReales);
      setProgreso(Math.min((segundosReales / tiempoEstimado) * 100, 100));
    }, 500);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [tiempoEstimado]);

  // EFECTO 3 — Detiene el intervalo cuando la prueba termina
  useEffect(() => {
    if (testFinished && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [testFinished]);

  const sendJSON = (data: object) => {
    window.api.sendSerial(JSON.stringify(data));
  };

  const handlePausePlay = () => {
    const estabaPausado = isPausedRef.current;

    if (estabaPausado) {
      // — REANUDAR —
      inicioRef.current = Date.now() - tiempoPausaRef.current * 1000;
      isPausedRef.current = false;
    } else {
      // — PAUSAR —
      if (inicioRef.current) {
        tiempoPausaRef.current = (Date.now() - inicioRef.current) / 1000;
        inicioRef.current = null;
      }
      isPausedRef.current = true;
    }

    setIsPaused(!estabaPausado);

    sendJSON({
      motor: 3,
      accion: "pause",
    });
  };

  const handleStopTest = () => {
    dialogRef.current?.showModal();
  };

  const handleTerminate = () => {
    sendJSON({
      motor: 3,
      accion: "terminate",
    });
  };

  function formatearTiempo(segundos: number) {
    const total = Math.ceil(segundos);

    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;

    return [
      h.toString().padStart(2, "0"),
      m.toString().padStart(2, "0"),
      s.toString().padStart(2, "0"),
    ].join(":");
  }

  return (
    <>
      {/* NAVBAR */}
      <div className="relative z-20">
        <Navbar
          ruta="/configurar-prueba"
          onClick={() => dialogRef.current?.showModal()}
        >
          Correr Prueba
        </Navbar>
      </div>

      <main className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center">
        {/* FONDO */}
        <div
          className="absolute inset-0 bg-cover bg-[position:90%_15%]"
          style={
            theme === temaOscuro
              ? { backgroundImage: `url(${FondoIntertekOscuro})` }
              : { backgroundImage: `url(${FondoIntertekClaro})` }
          }
        />

        {/* OVERLAY */}
        <div className="absolute inset-0 bg-black/50 z-0 pointer-events-none" />

        {/* CONTENIDO */}
        <div className="relative z-10 flex flex-col items-center w-full max-w-2xl gap-4 px-4">
          <Card>
            <div className="flex flex-col items-center gap-2 w-full">
              <Output size="badge-lg">Tiempo transcurrido</Output>

              <div className="w-full max-w-md mx-auto">
                <BarProgress progreso={progreso} />
              </div>

              {/* TIEMPOS */}
              <div className="flex justify-between w-full max-w-md">
                <Output>{formatearTiempo(tiempoTranscurrido)}</Output>
                <Output>{formatearTiempo(tiempoEstimado)}</Output>
              </div>

              <div className="divider w-full"></div>

              <Output size="badge-lg">Ciclos completados</Output>

              <RadialProgress
                ciclosTotales={Number(ciclos)}
                ciclosCompletados={ciclosCompletados}
              />
            </div>
          </Card>

          <Card>
            <div className="flex justify-between w-full max-w-md">
              <ActionButton
                name="pausarReanudar"
                onClick={handlePausePlay}
                outline={false}
                ancho={60}
              >
                {isPaused ? (
                  <>
                    <FaPlay /> <div>Play</div>
                  </>
                ) : (
                  <>
                    <FaPause /> <div>Pausa</div>
                  </>
                )}
              </ActionButton>

              <ActionButton
                name="detenerPrueba"
                onClick={handleStopTest}
                outline={false}
                ancho={60}
              >
                Detener Prueba
              </ActionButton>
            </div>

            <Modal
              ref={dialogRef}
              ruta="/configurar-prueba"
              onConfirm={handleTerminate}
              mode={testFinished ? "finished" : "confirm"}
            />
          </Card>
        </div>
      </main>
    </>
  );
}

export default CorrerPrueba;
