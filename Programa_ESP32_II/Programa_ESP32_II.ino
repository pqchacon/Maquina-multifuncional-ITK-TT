#include <Arduino.h>
#include <ArduinoJson.h>

// --------------------------------------------------------------
//              MACROS PARA EL MOTOR DEL IMPULSOR (DISPENSADOR)
// --------------------------------------------------------------
namespace
{
    // macros para la instancia del motor
    constexpr int PIN_PUL = 26;                 // pin de pulsos
    constexpr int PIN_DIR = 27;                 // pin de dirección
    constexpr int PIN_ENA = 14;                 // pin de enable
    constexpr int MOTOR_MICROSTEPS = 800;         // micropasos - 800
    constexpr int MOTOR_REDUCTOR = 1;           // reductor (1 default)
    constexpr int MOTOR_finH = 0;               // not used
    constexpr int MOTOR_finAH = 0;              // not used

    // macros para el movimiento continuo
    constexpr float VEL_RPM = 100;              // velocidad del motor
    constexpr bool SEN_HOR = true;              // indica el sentido
}
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
  unsigned long calcularTiempoEntrePulsos(float rpm)
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
  void iniciarContinuo(float rpm, bool horario)
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
  void iniciarPorPasos(long pasos, float rpm, bool horario)
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

Motor impulsor(PIN_PUL, PIN_DIR, PIN_ENA, MOTOR_MICROSTEPS, MOTOR_REDUCTOR, MOTOR_finH, MOTOR_finAH);

void setup()
{

}

void loop()
{
    // por ahora, siempre está en continuo movimiento
    impulsor.iniciarContinuo(VEL_RPM, SEN_HOR);
    impulsor.actualizar();
}