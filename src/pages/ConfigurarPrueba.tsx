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

type UnidadVelocidad = "mm/s" | "ciclos/min" | "segundos";

type CampoVelocidad = "velocidadEntrada" | "velocidadSalida";
type CampoInput = "ciclos" | CampoVelocidad | "esperaEntrada" | "esperaSalida";

function ConfigurarPrueba() {
  const { theme } = useContext(ThemeContext);

  /* ================================
     ROTACIÓN MOTOR
  ================================== */

  const [activeButton, setActiveButton] = useState<string | null>(null);
  const activePointerId = useRef<number | null>(null);

  const ciclosRef = useRef<HTMLInputElement>(null);
  const velocidadEntradaRef = useRef<HTMLInputElement>(null);
  const velocidadSalidaRef = useRef<HTMLInputElement>(null);
  const esperaEntradaRef = useRef<HTMLInputElement>(null);
  const esperaSalidaRef = useRef<HTMLInputElement>(null);
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
    velocidadEntrada: "",
    velocidadSalida: "",
    esperaEntrada: "",
    esperaSalida: "",
  });

  const [inputErrors, setInputErrors] = useState({
    ciclos: "",
    velocidadEntrada: "",
    velocidadSalida: "",
    esperaEntrada: "",
    esperaSalida: "",
  });

  const [activeInput, setActiveInput] = useState<CampoInput | null>(null);

  const [unidad, setUnidad] = useState<UnidadVelocidad | null>(null);

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

  const limitesVelocidad: Record<
    UnidadVelocidad,
    { min: number; max: number }
  > = {
    "mm/s": { min: 0.01, max: 50 },
    "ciclos/min": { min: 1, max: 30 },
    segundos: { min: 0.5, max: 60 },
  };

  const validarInput = (
    name: CampoInput,
    value: string,
    unidadActual: UnidadVelocidad | null = unidad,
  ) => {
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
      return;
    }

    if (name === "velocidadEntrada" || name === "velocidadSalida") {
      if (value === "." || value.endsWith(".")) {
        setInputErrors((prev) => ({
          ...prev,
          [name]: "Ingresa un valor decimal válido",
        }));
        return;
      }

      if (!unidadActual) {
        setInputErrors((prev) => ({ ...prev, [name]: "" }));
        return;
      }

      const { min, max } = limitesVelocidad[unidadActual];

      if (num < min || num > max) {
        setInputErrors((prev) => ({
          ...prev,
          [name]:
            unidadActual === "segundos"
              ? `El tiempo debe estar entre ${min} y ${max} s`
              : `La velocidad debe estar entre ${min} y ${max} ${unidadActual}`,
        }));
      } else {
        setInputErrors((prev) => ({ ...prev, [name]: "" }));
      }
      return;
    }

    // Validación de tiempos de espera: deben ser números positivos
    if (name === "esperaEntrada" || name === "esperaSalida") {
      if (value === "." || value.endsWith(".")) {
        setInputErrors((prev) => ({
          ...prev,
          [name]: "Ingresa un valor decimal válido",
        }));
        return;
      }

      if (num <= 0) {
        setInputErrors((prev) => ({
          ...prev,
          [name]: "El tiempo de espera debe ser mayor a 0",
        }));
      } else {
        setInputErrors((prev) => ({ ...prev, [name]: "" }));
      }
    }
  };

  const handleUnidadChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nuevaUnidad = e.target.value as UnidadVelocidad;
    setUnidad(nuevaUnidad);
    validarInput("velocidadEntrada", inputs.velocidadEntrada, nuevaUnidad);
    validarInput("velocidadSalida", inputs.velocidadSalida, nuevaUnidad);
  };

  /* ================================
     TECLADO NUMÉRICO
  ================================== */

  const sanitizeValue = (value: string, decimals?: number) => {
    if (decimals === undefined) {
      return value.replace(/\D/g, "");
    }

    value = value.replace(/[^0-9.]/g, "");

    const parts = value.split(".");

    if (parts.length > 2) {
      value = parts[0] + "." + parts.slice(1).join("");
    }

    if (value.includes(".")) {
      const [integer, decimal] = value.split(".");
      value = `${integer}.${decimal.slice(0, decimals)}`;
    }

    return value;
  };

  const handleKeyPress = (key: string) => {
    if (!activeInput) return;

    const decimalConfig: Record<CampoInput, number | undefined> = {
      ciclos: undefined,
      velocidadEntrada: 1,
      velocidadSalida: 1,
      esperaEntrada: 1,
      esperaSalida: 1,
    };

    const rawValue = inputs[activeInput] + key;
    const newValue = sanitizeValue(rawValue, decimalConfig[activeInput]);

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

    window.api.rendererReady();

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

  const PULSOS_POR_REV = 800;
  const REDUCCION = 20;
  const RPM_MOTOR_MAX = 1000; // rpm del motor, sin reducción
  const PASOS_POR_REV = PULSOS_POR_REV * REDUCCION;
  const RPM_SALIDA_MAX = RPM_MOTOR_MAX / REDUCCION; // 50 rpm de salida

  const errorEsperaEnCiclos = (espera: string, velocidad: string) => {
    if (unidad !== "ciclos/min" || espera === "" || velocidad === "") return "";

    const w = Number(espera);
    const v = Number(velocidad);
    if (!Number.isFinite(w) || !Number.isFinite(v) || v <= 0) return "";

    const tramo = 30 / v;

    // Tiempo mínimo de movimiento para no exceder RPM_SALIDA_MAX
    let movimientoMin = 0;
    if (positions.start !== null && positions.end !== null) {
      const distancia = Math.abs(positions.end - positions.start);
      movimientoMin = (distancia * 60) / (RPM_SALIDA_MAX * PASOS_POR_REV);
    }

    const limite = tramo - movimientoMin;
    if (w >= limite) {
      const maxima = Math.max(0, Math.floor(limite * 100) / 100);
      return `La espera debe ser menor a ${maxima} s (medio ciclo a ${v} ciclos/min)`;
    }
    return "";
  };

  const errorEsperaEntradaCiclos = errorEsperaEnCiclos(
    inputs.esperaEntrada,
    inputs.velocidadEntrada,
  );
  const errorEsperaSalidaCiclos = errorEsperaEnCiclos(
    inputs.esperaSalida,
    inputs.velocidadSalida,
  );

  const errorTiempoMinimo = (tiempo: string) => {
    if (unidad !== "segundos" || tiempo === "") return "";

    const t = Number(tiempo);
    if (!Number.isFinite(t) || t <= 0) return "";
    if (positions.start === null || positions.end === null) return "";

    const distancia = Math.abs(positions.end - positions.start);
    const minimo = (distancia * 60) / (RPM_SALIDA_MAX * PASOS_POR_REV);

    if (t < minimo) {
      return `El tiempo mínimo para esta carrera es ${Math.ceil(minimo * 100) / 100} s (límite de velocidad del motor)`;
    }
    return "";
  };

  const errorTiempoEntrada = errorTiempoMinimo(inputs.velocidadEntrada);
  const errorTiempoSalida = errorTiempoMinimo(inputs.velocidadSalida);

  const isReady =
    buttons.guardarPosicionInicial &&
    buttons.guardarPosicionFinal &&
    inputs.ciclos !== "" &&
    inputs.velocidadEntrada !== "" &&
    inputs.velocidadSalida !== "" &&
    unidad !== null &&
    !posicionesIguales &&
    !inputErrors.ciclos &&
    !inputErrors.velocidadEntrada &&
    !inputErrors.velocidadSalida &&
    !inputErrors.esperaEntrada &&
    !inputErrors.esperaSalida &&
    !errorEsperaEntradaCiclos &&
    !errorEsperaSalidaCiclos &&
    !errorTiempoEntrada &&
    !errorTiempoSalida;

  const handleIniciarPrueba = () => {
    if (!isReady) return;

    sendJSON({
      motor: 3,
      accion: "startTest",
      velocidadEntrada: Number(inputs.velocidadEntrada),
      velocidadSalida: Number(inputs.velocidadSalida),
      unidad: unidad,
      ciclos: Number(inputs.ciclos),
      esperaEntrada:
        inputs.esperaEntrada !== "" ? Number(inputs.esperaEntrada) : 0,
      esperaSalida:
        inputs.esperaSalida !== "" ? Number(inputs.esperaSalida) : 0,
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

        <div className="relative z-10 w-full flex flex-col items-center gap-5">
          <Card title="Control de Posición">
            {/* ROTACIÓN */}
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-22">
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
                >
                  <FaArrowRotateLeft size={28} />
                </ActionButton>

                <ActionButton name="borrarPosicion" onClick={handleButtons}>
                  <RiDeleteBin5Fill size={28} />
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
                >
                  <FaArrowRotateRight size={28} />
                </ActionButton>
              </div>

              <div className="flex items-center gap-10">
                <Output>Giro antihorario</Output>
                <Output>Borrar posiciones</Output>
                <Output>Giro horario</Output>
              </div>
            </div>

            {/* BOTONES */}
            <div className="flex items-center gap-25">
              <ActionButton
                name="guardarPosicionInicial"
                outline={false}
                disabled={buttons.guardarPosicionInicial}
                onClick={handleButtons}
              >
                Guardar Posición Inicial
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
          </Card>

          <Card title="Parámetros de Prueba">
            <div className="flex items-center gap-20">
              <div className="flex gap-6">
                <Input
                  name="velocidadEntrada"
                  placeholder={
                    unidad === "segundos"
                      ? "Tiempo de entrada"
                      : "Velocidad de entrada"
                  }
                  value={inputs.velocidadEntrada}
                  decimals={1}
                  onFocus={() => setActiveInput("velocidadEntrada")}
                  readOnly
                  error={inputErrors.velocidadEntrada || errorTiempoEntrada}
                  ref={velocidadEntradaRef}
                />

                <Input
                  name="velocidadSalida"
                  placeholder={
                    unidad === "segundos"
                      ? "Tiempo de salida"
                      : "Velocidad de salida"
                  }
                  value={inputs.velocidadSalida}
                  decimals={1}
                  onFocus={() => setActiveInput("velocidadSalida")}
                  readOnly
                  error={inputErrors.velocidadSalida || errorTiempoSalida}
                  ref={velocidadSalidaRef}
                />

                <select
                  value={unidad ?? ""}
                  onChange={handleUnidadChange}
                  className="select select-ghost w-30"
                >
                  <option value="" disabled>
                    Seleccionar Unidad
                  </option>
                  <option value="mm/s">mm/s</option>
                  <option value="ciclos/min">ciclos/min</option>
                  <option value="segundos">segundos</option>
                </select>
              </div>
            </div>

            {/* Tiempos de espera opcionales */}
            <div className="flex items-center gap-20">
              <div className="flex gap-6">
                <Input
                  name="esperaEntrada"
                  placeholder="Espera entrada (s)"
                  value={inputs.esperaEntrada}
                  decimals={1}
                  onFocus={() => setActiveInput("esperaEntrada")}
                  readOnly
                  error={inputErrors.esperaEntrada || errorEsperaEntradaCiclos}
                  ref={esperaEntradaRef}
                />

                <Input
                  name="esperaSalida"
                  placeholder="Espera salida (s)"
                  value={inputs.esperaSalida}
                  decimals={1}
                  onFocus={() => setActiveInput("esperaSalida")}
                  readOnly
                  error={inputErrors.esperaSalida || errorEsperaSalidaCiclos}
                  ref={esperaSalidaRef}
                />
                <Input
                  name="ciclos"
                  placeholder="Número de Ciclos"
                  value={inputs.ciclos}
                  decimals={0}
                  onFocus={() => setActiveInput("ciclos")}
                  readOnly
                  error={inputErrors.ciclos}
                  ref={ciclosRef}
                />
              </div>
            </div>

            <div className="flex items-center">
              <div className="flex gap-6"></div>

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
          <Keyboard onKeyPress={handleKeyPress} onBackspace={handleBackspace} />
        )}
      </main>
    </>
  );
}

export default ConfigurarPrueba;
