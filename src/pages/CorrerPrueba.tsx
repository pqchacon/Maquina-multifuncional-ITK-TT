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

  const [pausePlay, setPausePlay] = useState(false);
  const [ciclosCompletados, setCiclosCompletados] = useState(0);
  const [testFinished, setTestFinished] = useState(false);
  const [tiempoEstimado, setTiempoEstimado] = useState(0);
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState(0);
  const [progreso, setProgreso] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inicioRef = useRef<number | null>(null);
  const tiempoPausaRef = useRef<number>(0);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const location = useLocation();
  const ciclos = location.state?.sendDato ?? 0;

  useEffect(() => {
    const handleSerialData = (data: string) => {
      try {
        const parsed = JSON.parse(data);

        if (parsed.motor === 3) {
          if (parsed.estado === "cycle") {
            setCiclosCompletados(parsed.ciclos);
          }

          if (parsed.estado === "finished") {
            setTestFinished(true);
            dialogRef.current?.showModal();
          }

          if (parsed.estado === "config") {
            setTiempoEstimado(parsed.tiempoEstimado);
            setTiempoTranscurrido(0);
            setProgreso(0);
            setTestFinished(false);

            inicioRef.current = Date.now();
            tiempoPausaRef.current = 0;
          }
        }
      } catch (error) {
        console.error("Error parseando JSON:", error);
      }
    };

    window.api.onSerialData(handleSerialData);
  }, []);

  useEffect(() => {
    if (tiempoEstimado <= 0) return;
    if (testFinished) return;

    if (!pausePlay) {
      // Si estaba pausado, reanudar
      if (!inicioRef.current) {
        inicioRef.current = Date.now() - tiempoPausaRef.current * 1000;
      }

      intervalRef.current = setInterval(() => {
        if (!inicioRef.current) return;

        const segundosReales = (Date.now() - inicioRef.current) / 1000;

        setTiempoTranscurrido(segundosReales);

        const porcentaje = (segundosReales / tiempoEstimado) * 100;

        setProgreso(Math.min(porcentaje + 1, 100));
      }, 500); // 500ms más fluido
    } else {
      // Guardar tiempo acumulado al pausar
      if (inicioRef.current) {
        tiempoPausaRef.current = (Date.now() - inicioRef.current) / 1000;
        inicioRef.current = null;
      }

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [pausePlay, tiempoEstimado, testFinished]);

  const sendJSON = (data: object) => {
    window.api.sendSerial(JSON.stringify(data));
  };

  const handlePausePlay = () => {
    // Cambia estado visual
    setPausePlay((prev) => !prev);

    // Enviar comando a la ESP32
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
                {pausePlay ? (
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
