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
      int PUL, DIR, ENA;
      int pulsosPorRevolucion;
      int reduccion;
      int finHorario, finAntihorario;

      bool estadoPulso = LOW;
      unsigned long tiempoEntrePulsos = 0;
      unsigned long ultimoPulso = 0;

      long pasosTotales = 0;
      long pasosRealizados = 0;

      long posicionActual = 0;
      int direccionActual = 1;

      bool enMovimiento = false;
      bool modoContinuo = false;
      bool pausado = false;

    public:
      Motor(int pul, int dir, int ena, int micro, int red, int finH = -1, int finAH = -1)
      {
        PUL = pul; DIR = dir; ENA = ena;
        pulsosPorRevolucion = micro;
        reduccion = red;

        pinMode(PUL, OUTPUT);
        pinMode(DIR, OUTPUT);
        pinMode(ENA, OUTPUT);
        digitalWrite(ENA, LOW);

        finHorario = finH;
        if (finH != -1) pinMode(finHorario, INPUT);

        finAntihorario = finAH;
        if (finAH != -1) pinMode(finAntihorario, INPUT);
      }

      unsigned long calcularTiempoEntrePulsos(float rpm)
      {
        return (unsigned long)(60000000.0 / (rpm * pulsosPorRevolucion * reduccion * 2));
      }

      void configurarDireccion(bool sentidoHorario)
      {
        digitalWrite(DIR, sentidoHorario ? HIGH : LOW);
        direccionActual = sentidoHorario ? 1 : -1;
      }

      bool finDeCarreraActivado()
      {
        if (direccionActual == 1  && finHorario    != -1 && digitalRead(finHorario)    == LOW) return true;
        if (direccionActual == -1 && finAntihorario != -1 && digitalRead(finAntihorario) == LOW) return true;
        return false;
      }

      void iniciarContinuo(float rpm, bool horario)
      {
        configurarDireccion(horario);
        if (finDeCarreraActivado()) return;
        tiempoEntrePulsos = calcularTiempoEntrePulsos(rpm);
        ultimoPulso = micros();
        modoContinuo = true;
        enMovimiento = true;
        pausado = false;
      }

      void iniciarPorPasos(long pasos, float rpm, bool horario)
      {
        configurarDireccion(horario);
        if (finDeCarreraActivado()) return;
        pasosTotales = abs(pasos);
        pasosRealizados = 0;
        tiempoEntrePulsos = calcularTiempoEntrePulsos(rpm);
        ultimoPulso = micros();
        modoContinuo = false;
        enMovimiento = true;
        pausado = false;
      }

      void detener()
      {
        enMovimiento = false;
        pausado = false;
        digitalWrite(PUL, LOW);
      }

      void pausar()
      {
        if (enMovimiento) { pausado = true; digitalWrite(PUL, LOW); }
      }

      void reanudar()
      {
        if (pausado) { pausado = false; ultimoPulso = micros(); }
      }

      void actualizar()
      {
        if (!enMovimiento || pausado) return;
        if (finDeCarreraActivado()) { detener(); return; }

        unsigned long ahora = micros();
        if (ahora - ultimoPulso >= tiempoEntrePulsos)
        {
          ultimoPulso += tiempoEntrePulsos;
          estadoPulso = !estadoPulso;
          digitalWrite(PUL, estadoPulso);

          if (estadoPulso == HIGH)
          {
            pasosRealizados++;
            posicionActual += direccionActual;

            if (!modoContinuo && pasosRealizados >= pasosTotales)
            {
              enMovimiento = false;
              digitalWrite(PUL, LOW);
            }
          }
        }
      }

      long getPosicion()            { return posicionActual; }
      bool estaEnMovimiento()       { return enMovimiento; }
      int getPulsosPorRevolucion()  { return pulsosPorRevolucion; }
      int getReduccion()            { return reduccion; }
  };

  /* =========================================================
                          CLASE PRUEBA
    Hereda de Motor y añade lógica de prueba automática
    con velocidades de entrada/salida independientes y
    tiempos de espera opcionales al llegar a cada posición.
  ========================================================= */

  class Prueba : public Motor
  {
    private:
      long posicionInicio = 0;
      long posicionFinal  = 0;

      bool pruebaActiva    = false;
      bool yendoAFinal     = true;
      bool primerMovimiento = true;
      bool pruebaPausada   = false;

      int ciclosTotales    = 0;
      int ciclosCompletados = 0;

      // Velocidades del motor (rpm), ya convertidas antes de llegar aquí
      float velocidadEntrada = 0; // tramo posicionInicio → posicionFinal
      float velocidadSalida  = 0; // tramo posicionFinal  → posicionInicio

      // Tiempos de espera en ms al llegar a cada posición (0 = sin espera)
      //    esperaEntradaMs: espera al llegar a posicionFinal  (fin del tramo de entrada)
      //    esperaSalidaMs:  espera al llegar a posicionInicio (fin del tramo de salida)
      unsigned long esperaEntradaMs = 0;
      unsigned long esperaSalidaMs  = 0;

      // Control de espera no bloqueante con millis()
      bool          enEspera        = false;
      unsigned long inicioEspera    = 0;
      unsigned long duracionEspera  = 0;

      // Tramo pendiente que se ejecutará cuando termine la espera
      long  destinoPendiente    = 0;
      float velocidadPendiente  = 0;

    public:
      Prueba(int pul, int dir, int ena, int micro, int red)
          : Motor(pul, dir, ena, micro, red) {}

      void setPosicionInicio(long pos) { posicionInicio = pos; }
      void setPosicionFinal(long pos)  { posicionFinal  = pos; }

      float ciclosPorMinAVelocidadMotor(float ciclosPorMin)
      {
        long distanciaBase = abs(posicionFinal - posicionInicio);
        if (distanciaBase == 0) return 0;
        float pasosPorMin = ciclosPorMin * 2.0 * (float)distanciaBase;
        float pasosPorSeg = pasosPorMin / 60.0;
        return (pasosPorSeg * 60.0) / (getPulsosPorRevolucion() * getReduccion());
      }

      // Recibe también los tiempos de espera en segundos (0 = sin espera)
      void setPrueba(float velEntrada, float velSalida, int ciclos,
                    float esperaEntradaSeg, float esperaSalidaSeg)
      {
        if (posicionInicio == posicionFinal)
        {
          Serial.println("ERROR: Posiciones no válidas");
          return;
        }

        velocidadEntrada  = velEntrada;
        velocidadSalida   = velSalida;
        ciclosTotales     = ciclos;
        ciclosCompletados = 0;
        pruebaActiva      = true;
        primerMovimiento  = true;
        pruebaPausada     = false;
        enEspera          = false;

        // Convertir segundos → milisegundos
        esperaEntradaMs = (unsigned long)(esperaEntradaSeg * 1000.0);
        esperaSalidaMs  = (unsigned long)(esperaSalidaSeg  * 1000.0);

        enviarConfiguracionPrueba();

        long posicionActual = getPosicion();
        long destino;
        float velocidadPrimerMovimiento;

        if (posicionActual == posicionFinal)
        {
          // Semiciclo de posicionamiento: va a inicio a velocidad máxima
          destino = posicionInicio;
          yendoAFinal = false;
          velocidadPrimerMovimiento = max(velocidadEntrada, velocidadSalida);
        }
        else
        {
          // Ya está en posicionInicio: primer tramo de entrada del ciclo 1
          destino = posicionFinal;
          yendoAFinal = true;
          velocidadPrimerMovimiento = velocidadEntrada;
        }

        long distancia = destino - posicionActual;
        iniciarPorPasos(abs(distancia), velocidadPrimerMovimiento, distancia >= 0);
      }

      void togglePause()
      {
        if (!pruebaActiva) return;
        pruebaPausada = !pruebaPausada;

        if (pruebaPausada)
        {
          if (enEspera)
          {
            // Guardar tiempo restante de espera
            unsigned long transcurrido = millis() - inicioEspera;
            duracionEspera = (transcurrido < duracionEspera)
                              ? duracionEspera - transcurrido
                              : 0;
          }
          pausar();
          Serial.println("Prueba pausada");
        }
        else
        {
          if (enEspera)
          {
            // Reanudar cuenta desde el tiempo restante
            inicioEspera = millis();
          }
          reanudar();
          Serial.println("Prueba reanudada");
        }
      }

      void terminarPrueba()
      {
        if (!pruebaActiva) return;
        pruebaActiva  = false;
        pruebaPausada = false;
        enEspera      = false;
        detener();
        Serial.println("Prueba terminada manualmente");
      }

      void enviarCicloCompletado()
      {
        StaticJsonDocument<64> doc;
        doc["motor"]  = 3;
        doc["estado"] = "cycle";
        doc["ciclos"] = ciclosCompletados;
        serializeJson(doc, Serial);
        Serial.println();
      }

      void enviarPruebaFinalizada()
      {
        StaticJsonDocument<64> doc;
        doc["motor"]  = 3;
        doc["estado"] = "finished";
        serializeJson(doc, Serial);
        Serial.println();
      }

      void enviarPosicion(const char *tipo, long valor)
      {
        StaticJsonDocument<96> doc;
        doc["motor"]  = 3;
        doc["estado"] = "position";
        doc["tipo"]   = tipo;
        doc["valor"]  = valor;
        serializeJson(doc, Serial);
        Serial.println();
      }

      void enviarConfiguracionPrueba()
      {
        StaticJsonDocument<256> doc;
        doc["motor"]         = 3;
        doc["estado"]        = "config";
        doc["ciclos"]        = ciclosTotales;
        doc["tiempoEstimado"] = calcularTiempoEstimado();
        serializeJson(doc, Serial);
        Serial.println();
      }

      // Tiempo estimado incluye las esperas por ciclo
      double calcularTiempoEstimado()
      {
        long distanciaBase = abs(posicionFinal - posicionInicio);
        if (distanciaBase == 0 || velocidadEntrada == 0 || velocidadSalida == 0)
          return 0;

        uint64_t tPulsoEntrada = calcularTiempoEntrePulsos(velocidadEntrada);
        uint64_t tPulsoSalida  = calcularTiempoEntrePulsos(velocidadSalida);

        uint64_t tiempoPorPasoEntrada = tPulsoEntrada * 2ULL;
        uint64_t tiempoPorPasoSalida  = tPulsoSalida  * 2ULL;

        // Semiciclo de posicionamiento inicial (solo si arranca desde posicionFinal)
        uint64_t tiempoInicial = 0;
        if (getPosicion() == posicionFinal)
        {
          float vMax = max(velocidadEntrada, velocidadSalida);
          uint64_t tPulsoMax = calcularTiempoEntrePulsos(vMax);
          tiempoInicial = (uint64_t)distanciaBase * (tPulsoMax * 2ULL);
        }

        // Tiempo de movimiento por ciclo
        uint64_t tiempoTramoEntrada = (uint64_t)distanciaBase * tiempoPorPasoEntrada;
        uint64_t tiempoTramoSalida  = (uint64_t)distanciaBase * tiempoPorPasoSalida;

        // Esperas en microsegundos
        uint64_t esperaEntradaUs = (uint64_t)esperaEntradaMs * 1000ULL;
        uint64_t esperaSalidaUs  = (uint64_t)esperaSalidaMs  * 1000ULL;

        uint64_t tiempoPorCiclo =
            tiempoTramoEntrada + esperaEntradaUs +
            tiempoTramoSalida  + esperaSalidaUs;

        uint64_t tiempoTotal =
            tiempoInicial + ((uint64_t)ciclosTotales * tiempoPorCiclo);

        return (double)tiempoTotal / 1000000.0;
      }

      // Lógica principal: gestiona esperas no bloqueantes y transiciones de tramo
      void ejecutarPrueba()
      {
        if (pruebaPausada) return;

        // Verificar si la espera activa terminó
        if (enEspera)
        {
          if (millis() - inicioEspera >= duracionEspera)
          {
            // Espera terminada: arrancar el tramo pendiente
            enEspera = false;
            long distancia = destinoPendiente - getPosicion();
            iniciarPorPasos(abs(distancia), velocidadPendiente, distancia >= 0);
          }
          return; // Sigue esperando (o acaba de arrancar el movimiento)
        }

        if (!pruebaActiva || estaEnMovimiento()) return;

        // Motor parado y sin espera activa: decidir el siguiente tramo
        long posicionActual = getPosicion();
        long destino;
        float velocidadTramo;
        unsigned long esperaAntes = 0;

        if (primerMovimiento)
        {
          primerMovimiento = false;

          if (yendoAFinal)
          {
            // Llegamos a posicionFinal (primer tramo de entrada completado)
            // Aplica espera de entrada antes del tramo de salida
            esperaAntes   = esperaEntradaMs;
            destino       = posicionInicio;
            yendoAFinal   = false;
            velocidadTramo = velocidadSalida;
          }
          else
          {
            // Llegamos a posicionInicio desde el posicionamiento inicial
            // No aplica espera: este movimiento no es parte de los ciclos
            esperaAntes   = 0;
            destino       = posicionFinal;
            yendoAFinal   = true;
            velocidadTramo = velocidadEntrada;
          }
        }
        else
        {
          if (yendoAFinal)
          {
            // Llegamos a posicionFinal (tramo de entrada completado)
            // Aplica espera de entrada
            esperaAntes   = esperaEntradaMs;
            destino       = posicionInicio;
            yendoAFinal   = false;
            velocidadTramo = velocidadSalida;
          }
          else
          {
            // Llegamos a posicionInicio (tramo de salida completado): ciclo completo
            ciclosCompletados++;
            enviarCicloCompletado();

            if (ciclosCompletados >= ciclosTotales)
            {
              pruebaActiva = false;
              detener();
              enviarPruebaFinalizada();
              return;
            }

            // Aplica espera de salida antes del siguiente tramo de entrada
            esperaAntes   = esperaSalidaMs;
            destino       = posicionFinal;
            yendoAFinal   = true;
            velocidadTramo = velocidadEntrada;
          }
        }

        if (esperaAntes > 0)
        {
          // Iniciar espera no bloqueante y guardar el tramo pendiente
          enEspera          = true;
          inicioEspera      = millis();
          duracionEspera    = esperaAntes;
          destinoPendiente  = destino;
          velocidadPendiente = velocidadTramo;
          return;
        }

        // Sin espera: arrancar el tramo directamente
        long distancia = destino - posicionActual;
        iniciarPorPasos(abs(distancia), velocidadTramo, distancia >= 0);
      }
  };

  /* =========================================================
                          INSTANCIAS
  ========================================================= */

  Motor motor1(19, 18, 17, 800, 1, 16, 15); // Motor Torre
  Motor motor2(23, 22, 21, 800, 1, 35, 5);  // Motor Mesa
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

      int motor    = doc["motor"];
      String accion = doc["accion"];

      /* ================= MOTOR 1 ================= */
      if (motor == 1)
      {
        if (accion == "move")
        {
          String dir = doc["direccion"];
          if (dir == "left")  motor1.iniciarContinuo(100, true);
          else if (dir == "right") motor1.iniciarContinuo(100, false);
        }
        else if (accion == "stop") motor1.detener();
      }

      /* ================= MOTOR 2 ================= */
      else if (motor == 2)
      {
        if (accion == "move")
        {
          String dir = doc["direccion"];
          if (dir == "up")   motor2.iniciarContinuo(100, true);
          else if (dir == "down") motor2.iniciarContinuo(100, false);
        }
        else if (accion == "stop") motor2.detener();
      }

      /* ================= MOTOR 3 (PRUEBA) ================= */
      else if (motor == 3)
      {
        if (accion == "rotate")
        {
          String dir = doc["direccion"];
          if (dir == "CW")  prueba1.iniciarContinuo(3, true);
          else if (dir == "CCW") prueba1.iniciarContinuo(3, false);
        }
        else if (accion == "pause")
        {
          prueba1.togglePause();
        }
        else if (accion == "startTest")
        {
          float velEntradaInput  = doc["velocidadEntrada"];
          float velSalidaInput   = doc["velocidadSalida"];
          int   ciclos           = doc["ciclos"];
          String unidad          = doc["unidad"] | String("mm/s");

          // ✅ 0.0 si el campo no viene (campo vacío = sin espera)
          float esperaEntradaSeg = doc["esperaEntrada"] | 0.0f;
          float esperaSalidaSeg  = doc["esperaSalida"]  | 0.0f;

          float velocidadEntradaMotor;
          float velocidadSalidaMotor;

          if (unidad == "ciclos/min")
          {
            velocidadEntradaMotor = prueba1.ciclosPorMinAVelocidadMotor(velEntradaInput);
            velocidadSalidaMotor  = prueba1.ciclosPorMinAVelocidadMotor(velSalidaInput);
          }
          else
          {
            velocidadEntradaMotor = velEntradaInput * 0.15;
            velocidadSalidaMotor  = velSalidaInput  * 0.15;
          }

          prueba1.setPrueba(velocidadEntradaMotor, velocidadSalidaMotor,
                            ciclos, esperaEntradaSeg, esperaSalidaSeg);
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