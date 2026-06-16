#include <Arduino.h>
#include <ArduinoJson.h>
#include <ESP32Servo.h>
// librerías para el sensor de vuelo
#include <Wire.h>
#include <VL53L0X.h>

// --------------------------------------------------------------
//                        MACROS 
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

    // macros para el control del servo
    constexpr uint8_t PIN_SERVO = 15;                 // pin para controlar el servomotor
    constexpr uint16_t TIEMPO_ACTIVACION = 1000;    // Tiempo (ms) para accionar el servomotor
    constexpr uint8_t ANGULO_PARADO = 90;             // angulo inicial del servo
    constexpr uint8_t GIRO_DERECHA = 120;              // Angulo al que llega el servo (está en función de la longitud del mecanismo)
    constexpr uint8_t GIRO_IZQUIERDA = 60;              // Angulo para gire al otro sentido

    // macros para el sensor de tiempo de vuelo
    constexpr uint8_t PINXSHUT = 16;                  // pin para la selección de dispositivo
    constexpr uint8_t PIN_I2C_SDA = 21;
    constexpr uint8_t PIN_I2C_SCL = 22;
    constexpr uint32_t DISTANCIA_TIJERAS = 100;       // distancia que medirá más o menos el sensor para saber si hay algo dentro de ese rango. [10 cm] 
    constexpr uint8_t DISTANCIA_TOLVA = 100;         // distancia mínima para la tolva 
    constexpr uint8_t PIN_LED = 2;
}

// variables globales
volatile bool bandera_interrupcion = false;
volatile bool bandera_una_vez = false;
volatile bool primera_bandera = false;
volatile bool bandera_giro = false;
volatile bool bandera_segunda_vez = false;
uint32_t TIEMPO_ACTUAL = 0;


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

VL53L0X palillos;
VL53L0X tolva;

// Funcion de interrupcion para activar el servomotor cuando no hay ningún palillo según el 
// sensor infrarrojo de presencia ubicado dentro de la tolva.

void mover_servomotor(void)
{
  if(bandera_interrupcion)
  {
    if(bandera_una_vez)
    {
      servomotor.write(GIRO_DERECHA);
      TIEMPO_ACTUAL = millis();
      bandera_una_vez = false;
      bandera_segunda_vez = true;
      // Serial.println("Se inició");
    }

    if(millis() - TIEMPO_ACTUAL >= TIEMPO_ACTIVACION && bandera_una_vez == false && bandera_segunda_vez)
    {
      servomotor.write(GIRO_IZQUIERDA);
      bandera_giro = true;
      bandera_segunda_vez = false;
      TIEMPO_ACTUAL = millis();
      // bandera_interrupcion = false;
      // Serial.println("Se regresó");
    }

    if(bandera_giro)
    {
      // TIEMPO_ACTUAL = millis();
      if(millis() - TIEMPO_ACTUAL >= TIEMPO_ACTIVACION)
      {
        servomotor.write(ANGULO_PARADO);
        bandera_interrupcion = false;
        bandera_giro = false;
      }
      
    }
  }
}

void setup()
{
  Serial.begin(115200);

  // servomotor
  servomotor.attach(PIN_SERVO);
  servomotor.write(ANGULO_PARADO);

  // interrupcion para cuando no haya palillos. Será necesario checar si se queda con RISING o FALLING
  pinMode(PIN_LED, OUTPUT);

// time of flight sensor
  Wire.begin (PIN_I2C_SDA, PIN_I2C_SCL);
  pinMode(PINXSHUT, OUTPUT);
  digitalWrite(PINXSHUT, false);
  Serial.println("Configurando sensor palillos como dirección 0x30...");
  palillos.init();
  palillos.setAddress(0x30);
  palillos.setTimeout(500);

  Serial.println("La distancia actual de medición es de 10cm para el despliegue de palillos.");

  digitalWrite(PINXSHUT, true);
  Serial.println("Configurando sensor de la tolva como dirección 0x29...");
  tolva.init();
  tolva.setTimeout(500);
  Serial.println("La distancia actual de medición es de 10cm en la tolva.");
}

void loop()
{
  uint32_t distancia_palillos_calc = palillos.readRangeSingleMillimeters();
  if(palillos.timeoutOccurred())
  {
    Serial.println("Timeout en palillos!");
    digitalWrite(PIN_LED, !digitalRead(PIN_LED));
  }
  Serial.print("Distancia medida (palillos): ");
  Serial.println(distancia_palillos_calc);
  uint32_t distancia_tol_calc = tolva.readRangeSingleMillimeters();
  if(tolva.timeoutOccurred())
  {
    Serial.println("Timeout en tolva!");
    digitalWrite(PIN_LED, !digitalRead(PIN_LED));
  }
  Serial.print("Distancia medida (tolva): ");
  Serial.println(distancia_tol_calc);

  if(DISTANCIA_TIJERAS >= distancia_palillos_calc)
  {
    impulsor.detener();
    Serial.println("Deteniendo");
  }
  else
  {
    impulsor.iniciarContinuo(VEL_RPM, SEN_HOR);
    Serial.println("Avanzando");
  }
  if(DISTANCIA_TOLVA >= distancia_tol_calc)
  {
    digitalWrite(PIN_LED, true);
    primera_bandera = true;
  }
  else
  {
    digitalWrite(PIN_LED, false);
    if(primera_bandera)
    {
      bandera_interrupcion = true;
      bandera_una_vez = true;
      primera_bandera = false;
    }
  }

  impulsor.actualizar();
  mover_servomotor();
}