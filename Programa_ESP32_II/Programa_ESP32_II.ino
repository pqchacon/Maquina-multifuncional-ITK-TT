#include <Arduino.h>
#include <ArduinoJson.h>
#include <ESP32Servo.h>
// librerías para el sensor de vuelo
#include <Wire.h>
#include <VL53L0X.h>

// --------------------------------------------------------------
//                        MACROS 
// --------------------------------------------------------------

#define INFRARROJO_SEN
#ifndef INFRARROJO_SEN
  #define SENSORVUELO
#endif

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

    // macros para el control del sensor de presencia en la tolva
    constexpr uint8_t PIN_SENSOR = 18;          // pin al que irá conectado el sensor de presencia (para saber si hay palillos en la tolva)

    // macros para el control del servo
    constexpr uint8_t PIN_SERVO = 15;                 // pin para controlar el servomotor
    constexpr uint16_t TIEMPO_ACTIVACION = 500;      // Tiempo (ms) para accionar el servomotor
    constexpr uint8_t ANGULO_SERVO_INICIAL = 0;             // angulo inicial del servo
    constexpr uint8_t ANGULO_SERVO_FINAL = 90;              // Angulo al que llega el servo (está en función de la longitud del mecanismo)
#ifdef SENSORVUELO
    // macros para el sensor de tiempo de vuelo
    constexpr uint8_t PIN_I2C_SDA = 21;
    constexpr uint8_t PIN_I2C_SCL = 22;
    constexpr uint16_t DISTANCIA_TIJERAS = 100;       // distancia que medirá más o menos el sensor para saber si hay algo dentro de ese rango. [10 cm] 
#endif  //SENSORVUELO
#ifdef INFRARROJO_SEN
    constexpr uint8_t PIN_INFRARROJO = 17;
#endif  //INFRARROJO_SEN
    // macro para el control del LED interno de la placa de desarrollo
    constexpr uint8_t PIN_LED = 2;
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
Servo servomotor;
VL53L0X tof_sensor;

// Funcion de interrupcion para activar el servomotor cuando no hay ningún palillo según el 
// sensor infrarrojo de presencia ubicado dentro de la tolva.
void activacion_servomotor_ISR(void)
{
  Serial.println("Se entró a la interrupcion");
  servomotor.write(ANGULO_SERVO_FINAL);
  uint32_t TIEMPO_ANTERIOR = millis();
  while(millis() - TIEMPO_ANTERIOR <= TIEMPO_ACTIVACION)
  {
    // no hacer nada
  }
  servomotor.write(ANGULO_SERVO_INICIAL);
  Serial.println("Se salio del bucle While");
  return;
}

void setup()
{
  Serial.begin(115200);
  // servomotor
  servomotor.attach(PIN_SERVO);

  // interrupcion para cuando no haya palillos. Será necesario checar si se queda con RISING o FALLING
  attachInterrupt(digitalPinToInterrupt(PIN_SENSOR), activacion_servomotor_ISR, FALLING);
  pinMode(PIN_LED, OUTPUT);
#ifdef SENSORVUELO
// time of flight sensor
  Serial.println("Se inicializó el sensor de vuelo.");
  Wire.begin (PIN_I2C_SDA, PIN_I2C_SCL);
  tof_sensor.setTimeout(500);
  if(!tof_sensor.init())
  {
    // no se detectó el sensor de vuelo
    while(1)
    {
      digitalWrite(PIN_LED, true);
      delay(500);
      digitalWrite(PIN_LED, false);
      delay(500);
      // será necesario reiniciar el uC.
    }
  }
#endif //SENSORVUELO
#ifdef INFRARROJO_SEN
  Serial.println("Se inicializó el sensor infrarrojo.");
  pinMode(PIN_INFRARROJO, INPUT);
#endif
}

void loop()
{
#ifdef SENSORVUELO
  int distancia = tof_sensor.readRangeSingleMillimeters();
  if(DISTANCIA_TIJERAS >= distancia)
  {
    // esto quiere decir que hay algo que está detectando en menos de 10 cm. 
    // Por lo tanto, va a estar activando el motor a pasos hasta que deje de detectar algo en menos de 10 cm. 
    // Estos 10 cm tendrán que ser modificados, por ahora solamente es cuestión de ve si compila el código.
    // impulsor.iniciarContinuo(VEL_RPM, true);
    impulsor.detener();
  }
  else
  {
    // debido a que no se está detectando nada, se estará moviendo el motor.
    // impulsor.detener();
    impulsor.iniciarContinuo(VEL_RPM, SEN_HOR);
  }
  impulsor.actualizar();
#endif  //sensorvuelo
#ifdef INFRARROJO_SEN
  if(digitalRead(PIN_INFRARROJO))
  {
    impulsor.detener();
    Serial.println("deteniendo");
  }
  else
  {
    impulsor.iniciarContinuo(VEL_RPM, SEN_HOR);
    Serial.println("avanzando");
  }
  impulsor.actualizar();
#endif //infrarrojo_sen
}