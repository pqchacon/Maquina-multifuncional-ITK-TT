import { useState, useRef, useEffect, useContext } from "react";
import { temaOscuro, ThemeContext } from "../App";
import NavigateSendButton from "../components/Buttons/NavigateSendButton";
import ActionButton from "../components/Buttons/ActionButton";
import Input from "../components/Input";
import Output from "../components/Output";
import Navbar from "../components/Navbar";
import Card from "../components/Card";
import Keyboard from "../components/Keyboard";

import FondoIntertekClaro from "../assets/FondoIntertekClaro.jpg";
import FondoIntertekOscuro from "../assets/FondoIntertekOscuro.jpg";

import { FaArrowRotateLeft, FaArrowRotateRight } from "react-icons/fa6";
import { RiDeleteBin5Fill } from "react-icons/ri";

function ConfigurarPrueba() {
  const { theme } = useContext(ThemeContext);

  /* ================================
     ROTACIÓN MOTOR
  ================================== */

  const [activeButton, setActiveButton] = useState<string | null>(null);
  const activePointerId = useRef<number | null>(null);

  const ciclosRef = useRef<HTMLInputElement>(null);
  const velocidadRef = useRef<HTMLInputElement>(null);
  const keyboardRef = useRef<HTMLDivElement>(null);

  const rotateCommandMap: Record<string, string> = {
    rotarManivelaAntihorario: "CCW",
    rotarManivelaHorario: "CW",
  };

  const sendJSON = (data: object) => {
    window.api.sendSerial(JSON.stringify(data));
  };

  const stopRotateMotor = () => {
    sendJSON({ motor: 3, accion: "stop" });
    setActiveButton(null);
    activePointerId.current = null;
  };

  const handleRotatePointerDown = (
    e: React.PointerEvent<HTMLButtonElement>,
  ) => {
    const { name } = e.currentTarget;

    if (activeButton !== null) return;

    const direccion = rotateCommandMap[name];

    if (direccion) {
      sendJSON({
        motor: 3,
        accion: "rotate",
        direccion,
      });
    }

    activePointerId.current = e.pointerId;
    setActiveButton(name);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleRotatePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (activeButton && activePointerId.current === e.pointerId) {
      stopRotateMotor();
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const handleRotatePointerCancel = stopRotateMotor;
  const handleRotatePointerLeave = stopRotateMotor;

  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (activeButton) stopRotateMotor();
    };

    window.addEventListener("pointerup", handleGlobalPointerUp);
    window.addEventListener("pointercancel", handleGlobalPointerUp);

    return () => {
      window.removeEventListener("pointerup", handleGlobalPointerUp);
      window.removeEventListener("pointercancel", handleGlobalPointerUp);
    };
  }, [activeButton]);

  /* ================================
     POSICIONES
  ================================== */

  const [positions, setPositions] = useState<{
    start: number | null;
    end: number | null;
  }>({
    start: null,
    end: null,
  });

  /* ================================
     BOTONES
  ================================== */

  const [buttons, setButtons] = useState({
    guardarPosicionInicial: false,
    guardarPosicionFinal: false,
  });

  const [inputs, setInputs] = useState({
    ciclos: "",
    velocidad: "",
  });

  const [inputErrors, setInputErrors] = useState({
    ciclos: "",
    velocidad: "",
  });

  const [activeInput, setActiveInput] = useState<"ciclos" | "velocidad" | null>(
    null,
  );

  const posicionesIguales =
    buttons.guardarPosicionInicial &&
    buttons.guardarPosicionFinal &&
    positions.start !== null &&
    positions.end !== null &&
    positions.start === positions.end;

  const handleButtons = (e: React.MouseEvent<HTMLButtonElement>) => {
    const { name } = e.currentTarget;

    if (name === "borrarPosicion") {
      sendJSON({ motor: 3, accion: "resetPositions" });

      setButtons({
        guardarPosicionInicial: false,
        guardarPosicionFinal: false,
      });

      setPositions({ start: null, end: null });
      return;
    }

    if (name === "guardarPosicionInicial") {
      sendJSON({ motor: 3, accion: "saveStart" });
    }

    if (name === "guardarPosicionFinal") {
      sendJSON({ motor: 3, accion: "saveEnd" });
    }

    setButtons((prev) => ({
      ...prev,
      [name]: true,
    }));
  };

  /* ================================
     VALIDACIÓN INPUTS
  ================================== */

  const validarInput = (name: "ciclos" | "velocidad", value: string) => {
    if (value === "") {
      setInputErrors((prev) => ({ ...prev, [name]: "" }));
      return;
    }

    const num = Number(value);

    if (name === "ciclos") {
      if (num < 1 || num > 1000000) {
        setInputErrors((prev) => ({
          ...prev,
          ciclos: "El número de ciclos debe estar entre 1 y 1,000,000",
        }));
      } else {
        setInputErrors((prev) => ({ ...prev, ciclos: "" }));
      }
    }

    if (name === "velocidad") {
      if (num < 1 || num > 50) {
        setInputErrors((prev) => ({
          ...prev,
          velocidad: "La velocidad debe estar entre 1 y 50",
        }));
      } else {
        setInputErrors((prev) => ({ ...prev, velocidad: "" }));
      }
    }
  };

  /* ================================
     TECLADO NUMÉRICO
  ================================== */

  const handleKeyPress = (key: string) => {
    if (!activeInput) return;

    const newValue = inputs[activeInput] + key;

    setInputs((prev) => ({
      ...prev,
      [activeInput]: newValue,
    }));

    validarInput(activeInput, newValue);
  };

  const handleBackspace = () => {
    if (!activeInput) return;

    const newValue = inputs[activeInput].slice(0, -1);

    setInputs((prev) => ({
      ...prev,
      [activeInput]: newValue,
    }));

    validarInput(activeInput, newValue);
  };

  const handleEnter = () => {
    // Cerrar teclado
    setActiveInput(null);

    setTimeout(() => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }, 0);
  };

  /* ================================
     SERIAL
  ================================== */

  useEffect(() => {
    const unsubscribe = window.api.onSerialData((data: string) => {
      try {
        const parsed = JSON.parse(data);

        if (parsed.motor === 3 && parsed.estado === "position") {
          if (parsed.tipo === "start") {
            setPositions((prev) => ({ ...prev, start: parsed.valor }));
          }

          if (parsed.tipo === "end") {
            setPositions((prev) => ({ ...prev, end: parsed.valor }));
          }
        }
      } catch (err) {
        console.error("Error parseando JSON:", err);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: PointerEvent) => {
      const target = e.target as Node;

      const isClickInsideKeyboard = keyboardRef.current?.contains(target);

      const isInput = target instanceof HTMLInputElement;

      if (!isClickInsideKeyboard && !isInput) {
        setActiveInput(null);

        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }
    };

    document.addEventListener("pointerdown", handleClickOutside);

    return () => {
      document.removeEventListener("pointerdown", handleClickOutside);
    };
  }, []);

  /* ================================
     INICIAR PRUEBA
  ================================== */

  const isReady =
    buttons.guardarPosicionInicial &&
    buttons.guardarPosicionFinal &&
    inputs.ciclos !== "" &&
    inputs.velocidad !== "" &&
    !posicionesIguales &&
    !inputErrors.ciclos &&
    !inputErrors.velocidad;

  const handleIniciarPrueba = () => {
    if (!isReady) return;

    sendJSON({
      motor: 3,
      accion: "startTest",
      velocidad: Number(inputs.velocidad),
      ciclos: Number(inputs.ciclos),
    });
  };

  return (
    <>
      <Navbar ruta="/">Configurar Prueba</Navbar>

      <main className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div
          className="absolute inset-0 bg-cover bg-[position:78%_15%]"
          style={
            theme === temaOscuro
              ? { backgroundImage: `url(${FondoIntertekOscuro})` }
              : { backgroundImage: `url(${FondoIntertekClaro})` }
          }
        />

        <div className="absolute inset-0 bg-black/50" />

        <div className="relative z-10 w-full flex flex-col items-center gap-10">
          <Card title="Control de Posición">
            {/* ROTACIÓN */}
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-60">
                <ActionButton
                  name="rotarManivelaAntihorario"
                  disabled={
                    (activeButton !== null &&
                      activeButton !== "rotarManivelaAntihorario") ||
                    (buttons.guardarPosicionFinal &&
                      buttons.guardarPosicionInicial)
                  }
                  onPointerDown={handleRotatePointerDown}
                  onPointerUp={handleRotatePointerUp}
                  onPointerCancel={handleRotatePointerCancel}
                  onPointerLeave={handleRotatePointerLeave}
                >
                  <FaArrowRotateLeft size={28} />
                </ActionButton>

                <ActionButton
                  name="rotarManivelaHorario"
                  disabled={
                    (activeButton !== null &&
                      activeButton !== "rotarManivelaHorario") ||
                    (buttons.guardarPosicionFinal &&
                      buttons.guardarPosicionInicial)
                  }
                  onPointerDown={handleRotatePointerDown}
                  onPointerUp={handleRotatePointerUp}
                  onPointerCancel={handleRotatePointerCancel}
                  onPointerLeave={handleRotatePointerLeave}
                >
                  <FaArrowRotateRight size={28} />
                </ActionButton>
              </div>

              <div className="flex items-center gap-50">
                <Output>Giro antihorario</Output>
                <Output>Giro horario</Output>
              </div>
            </div>

            {/* BOTONES */}
            <div className="flex items-center gap-8">
              <ActionButton
                name="guardarPosicionInicial"
                outline={false}
                disabled={buttons.guardarPosicionInicial}
                onClick={handleButtons}
              >
                Guardar Posición de Inicio
              </ActionButton>

              <ActionButton
                name="guardarPosicionFinal"
                outline={false}
                disabled={buttons.guardarPosicionFinal}
                onClick={handleButtons}
              >
                Guardar Posición Final
              </ActionButton>
            </div>

            {posicionesIguales && (
              <p className="text-red-500 font-semibold">
                La posición de inicio y final no pueden ser iguales
              </p>
            )}

            <ActionButton name="borrarPosicion" onClick={handleButtons}>
              <RiDeleteBin5Fill size={28} />
              Borrar Posición
            </ActionButton>
          </Card>

          <Card title="Parámetros de Prueba">
            <div className="flex items-center gap-20">
              <div className="flex gap-6">
                <Input
                  name="ciclos"
                  placeholder="Número de Ciclos"
                  value={inputs.ciclos}
                  onFocus={() => setActiveInput("ciclos")}
                  readOnly
                  error={inputErrors.ciclos}
                  ref={ciclosRef}
                />

                <Input
                  name="velocidad"
                  placeholder="Velocidad"
                  value={inputs.velocidad}
                  onFocus={() => setActiveInput("velocidad")}
                  readOnly
                  error={inputErrors.velocidad}
                  ref={velocidadRef}
                />
              </div>

              <NavigateSendButton
                name="iniciarPrueba"
                disable={!isReady}
                ruta="/configurar-prueba/correr-prueba"
                onClick={handleIniciarPrueba}
                dato={inputs.ciclos}
              >
                Iniciar Prueba
              </NavigateSendButton>
            </div>
          </Card>
        </div>

        {/* TECLADO */}
        {activeInput && (
          <Keyboard
            onKeyPress={handleKeyPress}
            onBackspace={handleBackspace}
            onEnter={handleEnter}
          />
        )}
      </main>
    </>
  );
}

export default ConfigurarPrueba;
