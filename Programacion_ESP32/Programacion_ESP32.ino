#include <Arduino.h>
#include <ArduinoJson.h>

/* =========================================================
                        CLASE MOTOR
    Clase base que controla un motor paso a paso mediante
    señales PUL (pulso), DIR (dirección) y ENA (enable)
========================================================= */

class Motor
{
protected:
  // Pines de control del driver
  int PUL, DIR, ENA;

  // Configuración mecánica
  int pulsosPorRevolucion; // micropasos
  int reduccion;           // relación de reducción

  // Finales de carrera
  int finHorario, finAntihorario;

  // Control de generación de pulsos (timing)
  bool estadoPulso = LOW;
  unsigned long tiempoEntrePulsos = 0;
  unsigned long ultimoPulso = 0;

  // Control de movimiento
  long pasosTotales = 0;
  long pasosRealizados = 0;

  // Estado de posición
  long posicionActual = 0;
  int direccionActual = 1;

  // Estados del motor
  bool enMovimiento = false;
  bool modoContinuo = false;
  bool pausado = false;

public:
  // Constructor: configura pines y parámetros del motor
  Motor(int pul, int dir, int ena, int micro, int red, int finH = -1, int finAH = -1)
  {
    PUL = pul;
    DIR = dir;
    ENA = ena;
    pulsosPorRevolucion = micro;
    reduccion = red;

    pinMode(PUL, OUTPUT);
    pinMode(DIR, OUTPUT);
    pinMode(ENA, OUTPUT);

    digitalWrite(ENA, LOW);
    if (finH != -1)
    {
      finHorario = finH;
      pinMode(finHorario, INPUT);
    }
    else
      finHorario = -1;
    if (finAH != -1)
    {
      finAntihorario = finAH;
      pinMode(finAntihorario, INPUT);
    }
    else
      finAntihorario = -1;
  }

  // Calcula el tiempo entre pulsos en microsegundos según RPM
  unsigned long calcularTiempoEntrePulsos(int rpm)
  {
    return (unsigned long)(60000000.0 /
                           (rpm * pulsosPorRevolucion * reduccion * 2));
  }

  // Configura la dirección del giro
  void configurarDireccion(bool sentidoHorario)
  {
    digitalWrite(DIR, sentidoHorario ? HIGH : LOW);
    direccionActual = sentidoHorario ? 1 : -1;
  }

  bool finDeCarreraActivado()
  {
    // Si va en sentido horario
    if (direccionActual == 1 && finHorario != -1)
    {
      if (digitalRead(finHorario) == LOW)
        return true;
    }

    // Si va en sentido antihorario
    if (direccionActual == -1 && finAntihorario != -1)
    {
      if (digitalRead(finAntihorario) == LOW)
        return true;
    }

    return false;
  }

  // Inicia movimiento continuo (sin límite de pasos)
  void iniciarContinuo(int rpm, bool horario)
  {
    configurarDireccion(horario);

    if (finDeCarreraActivado())
      return;

    tiempoEntrePulsos = calcularTiempoEntrePulsos(rpm);
    ultimoPulso = micros();

    modoContinuo = true;
    enMovimiento = true;
    pausado = false;
  }

  // Inicia movimiento por cantidad de pasos definida
  void iniciarPorPasos(long pasos, int rpm, bool horario)
  {
    configurarDireccion(horario);

    if (finDeCarreraActivado())
      return;

    pasosTotales = abs(pasos);
    pasosRealizados = 0;

    tiempoEntrePulsos = calcularTiempoEntrePulsos(rpm);
    ultimoPulso = micros();

    modoContinuo = false;
    enMovimiento = true;
    pausado = false;
  }

  // Detiene completamente el motor
  void detener()
  {
    enMovimiento = false;
    pausado = false;
    digitalWrite(PUL, LOW);
  }

  // Pausa el movimiento sin perder estado
  void pausar()
  {
    if (enMovimiento)
    {
      pausado = true;
      digitalWrite(PUL, LOW);
    }
  }

  // Reanuda el movimiento desde donde se pausó
  void reanudar()
  {
    if (pausado)
    {
      pausado = false;
      ultimoPulso = micros();
    }
  }

  // Función que debe llamarse constantemente (loop)
  // Genera los pulsos sin bloquear el programa
  void actualizar()
  {
    if (!enMovimiento || pausado)
      return;

    if (finDeCarreraActivado())
    {
      detener();
      return;
    }

    unsigned long ahora = micros();

    if (ahora - ultimoPulso >= tiempoEntrePulsos)
    {
      ultimoPulso += tiempoEntrePulsos;

      estadoPulso = !estadoPulso;
      digitalWrite(PUL, estadoPulso);

      // Solo contar pasos en flanco HIGH
      if (estadoPulso == HIGH)
      {
        pasosRealizados++;
        posicionActual += direccionActual;

        // Detener si se alcanzó el objetivo
        if (!modoContinuo && pasosRealizados >= pasosTotales)
        {
          enMovimiento = false;
          digitalWrite(PUL, LOW);
        }
      }
    }
  }

  // Getters
  long getPosicion() { return posicionActual; }
  bool estaEnMovimiento() { return enMovimiento; }
};

/* =========================================================
                        CLASE PRUEBA
  Hereda de Motor y añade lógica de prueba automática
   (movimientos entre posiciones con ciclos)
========================================================= */

class Prueba : public Motor
{
private:
  long posicionInicio = 0;
  long posicionFinal = 0;

  // Estado de la prueba
  bool pruebaActiva = false;
  bool yendoAFinal = true;
  bool primerMovimiento = true;
  bool pruebaPausada = false;

  // Configuración de la prueba
  int ciclosTotales = 0;
  int ciclosCompletados = 0;
  int velocidadPrueba = 0;

public:
  // Constructor: reutiliza el constructor de Motor
  Prueba(int pul, int dir, int ena, int micro, int red)
      : Motor(pul, dir, ena, micro, red) {}

  // Setters de posiciones
  void setPosicionInicio(long pos) { posicionInicio = pos; }
  void setPosicionFinal(long pos) { posicionFinal = pos; }

  // Configura e inicia la prueba
  void setPrueba(int velocidad, int ciclos)
  {
    if (posicionInicio == posicionFinal)
    {
      Serial.println("ERROR: Posiciones no válidas");
      return;
    }

    velocidadPrueba = velocidad;
    ciclosTotales = ciclos;
    ciclosCompletados = 0;
    pruebaActiva = true;
    primerMovimiento = true;
    pruebaPausada = false;

    enviarConfiguracionPrueba();

    // Decide a qué punto ir primero
    long posicionActual = getPosicion();
    long destino;

    if (abs(posicionActual - posicionInicio) <
        abs(posicionActual - posicionFinal))
    {
      destino = posicionFinal;
      yendoAFinal = true;
    }
    else
    {
      destino = posicionInicio;
      yendoAFinal = false;
    }

    long distancia = destino - posicionActual;
    bool horario = (distancia >= 0);

    iniciarPorPasos(abs(distancia), velocidadPrueba, horario);
  }

  // Pausa/Reanuda la prueba
  void togglePause()
  {
    if (!pruebaActiva)
      return;

    pruebaPausada = !pruebaPausada;

    if (pruebaPausada)
    {
      pausar();
      Serial.println("Prueba pausada");
    }
    else
    {
      reanudar();
      Serial.println("Prueba reanudada");
    }
  }

  // Termina la prueba manualmente
  void terminarPrueba()
  {
    if (!pruebaActiva)
      return;

    pruebaActiva = false;
    pruebaPausada = false;

    detener();

    Serial.println("Prueba terminada manualmente");
  }

  // Envía eventos por Serial (JSON)
  void enviarCicloCompletado()
  {
    StaticJsonDocument<64> doc;
    doc["motor"] = 3;
    doc["estado"] = "cycle";
    doc["ciclos"] = ciclosCompletados;

    serializeJson(doc, Serial);
    Serial.println(); // necesario para ReadlineParser
  }

  void enviarPruebaFinalizada()
  {
    StaticJsonDocument<64> doc;
    doc["motor"] = 3;
    doc["estado"] = "finished";

    serializeJson(doc, Serial);
    Serial.println();
  }

  // Calcula tiempo estimado de la prueba en segundos
  double calcularTiempoEstimado()
  {
    long distanciaBase = abs(posicionFinal - posicionInicio);
    if (distanciaBase == 0 || velocidadPrueba == 0)
      return 0;

    uint64_t tPulso = calcularTiempoEntrePulsos(velocidadPrueba);

    uint64_t tiempoPorPaso = tPulso * 2ULL;

    long posicionActual = getPosicion();
    long distanciaInicial = abs(posicionActual - posicionInicio);

    uint64_t tiempoInicial =
        (uint64_t)distanciaInicial * tiempoPorPaso;

    uint64_t tiempoPorCiclo =
        (uint64_t)(2LL * distanciaBase) * tiempoPorPaso;

    uint64_t tiempoTotal =
        tiempoInicial +
        ((uint64_t)ciclosTotales * tiempoPorCiclo);

    return (float)(tiempoTotal / 1000000.0);
  }

  // Envío genérico de posición
  void enviarPosicion(const char *tipo, long valor)
  {
    StaticJsonDocument<96> doc;
    doc["motor"] = 3;
    doc["estado"] = "position";
    doc["tipo"] = tipo;
    doc["valor"] = valor;

    serializeJson(doc, Serial);
    Serial.println();
  }

  // Envía configuración inicial de la prueba
  void enviarConfiguracionPrueba()
  {
    StaticJsonDocument<128> doc;

    doc["motor"] = 3;
    doc["estado"] = "config";
    doc["ciclos"] = ciclosTotales;
    doc["tiempoEstimado"] = calcularTiempoEstimado();

    serializeJson(doc, Serial);
    Serial.println();
  }

  // Lógica principal de la prueba
  void ejecutarPrueba()
  {
    if (pruebaPausada)
      return;

    if (pruebaActiva && !estaEnMovimiento())
    {
      long posicionActual = getPosicion();
      long destino;
      // Primer movimiento (decisión inicial)
      if (primerMovimiento)
      {
        primerMovimiento = false;

        if (yendoAFinal)
        {
          destino = posicionInicio;
          yendoAFinal = false;
        }
        else
        {
          destino = posicionFinal;
          yendoAFinal = true;
        }
      }
      else
      {
        if (yendoAFinal)
        {
          destino = posicionInicio;
          yendoAFinal = false;
        }
        else
        {
          ciclosCompletados++;

          enviarCicloCompletado();

          // Fin de la prueba
          if (ciclosCompletados >= ciclosTotales)
          {
            pruebaActiva = false;
            detener();
            enviarPruebaFinalizada();
            return;
          }

          destino = posicionFinal;
          yendoAFinal = true;
        }
      }

      long distancia = destino - posicionActual;
      bool horario = (distancia >= 0);

      iniciarPorPasos(abs(distancia), velocidadPrueba, horario);
    }
  }
};

/* =========================================================
                        INSTANCIAS
========================================================= */

Motor motor1(19, 18, 17, 800, 1, 16, 15); //Motor Torre
Motor motor2(23, 22, 21, 800, 1, 35, 5);  //Motor Mesa
Prueba prueba1(32, 33, 25, 800, 20);

/* ========================================================= */

void setup()
{
  Serial.begin(115200);
  delay(1000);
  Serial.println("ESP32 lista");
}

/* ========================================================= */

void loop()
{
  if (Serial.available())
  {
    String input = Serial.readStringUntil('\n');
    input.trim();

    StaticJsonDocument<256> doc;
    if (deserializeJson(doc, input))
    {
      Serial.println("Error JSON");
      return;
    }

    int motor = doc["motor"];
    String accion = doc["accion"];

    /* ================= MOTOR 1 ================= */
    if (motor == 1)
    {
      if (accion == "move")
      {
        String dir = doc["direccion"];
        if (dir == "left")
          motor1.iniciarContinuo(100, true);
        else if (dir == "right")
          motor1.iniciarContinuo(100, false);
      }
      else if (accion == "stop")
        motor1.detener();
    }

    /* ================= MOTOR 2 ================= */
    else if (motor == 2)
    {
      if (accion == "move")
      {
        String dir = doc["direccion"];
        if (dir == "up")
          motor2.iniciarContinuo(100, true);
        else if (dir == "down")
          motor2.iniciarContinuo(100, false);
      }
      else if (accion == "stop")
        motor2.detener();
    }

    /* ================= MOTOR 3 (PRUEBA) ================= */
    else if (motor == 3)
    {
      if (accion == "rotate")
      {
        String dir = doc["direccion"];
        if (dir == "CW")
          prueba1.iniciarContinuo(5, true);
        else if (dir == "CCW")
          prueba1.iniciarContinuo(5, false);
      }
      else if (accion == "pause")
      {
        prueba1.togglePause();
      }
      else if (accion == "startTest")
      {
        int velocidad = doc["velocidad"];
        int ciclos = doc["ciclos"];
        prueba1.setPrueba(velocidad, ciclos);
      }
      else if (accion == "saveStart")
      {
        long pos = prueba1.getPosicion();
        prueba1.setPosicionInicio(pos);
        prueba1.enviarPosicion("start", pos);
      }
      else if (accion == "saveEnd")
      {
        long pos = prueba1.getPosicion();
        prueba1.setPosicionFinal(pos);
        prueba1.enviarPosicion("end", pos);
      }
      else if (accion == "resetPositions")
      {
        prueba1.setPosicionInicio(0);
        prueba1.setPosicionFinal(0);

        prueba1.enviarPosicion("start", 0);
        prueba1.enviarPosicion("end", 0);
      }
      else if (accion == "terminate")
      {
        prueba1.terminarPrueba();
      }
      else if (accion == "stop")
      {
        prueba1.detener();
      }
    }
  }

  prueba1.ejecutarPrueba();

  motor1.actualizar();
  motor2.actualizar();
  prueba1.actualizar();
}