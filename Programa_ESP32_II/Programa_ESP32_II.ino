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
    constexpr int PIN_PUL = 19;                 // pin de pulsos
    constexpr int PIN_DIR = 18;                 // pin de dirección
    constexpr int PIN_ENA = 17;                 // pin de enable
    constexpr int MOTOR_MICROSTEPS = 800;         // micropasos - 800
    constexpr int MOTOR_REDUCTOR = 1;           // reductor (1 default)

    // macros para el movimiento continuo
    constexpr float VEL_RPM = 360;              // velocidad del motor
    constexpr bool SEN_HOR = true;              // indica el sentido

    // macros para el control del servo
    constexpr uint8_t PIN_SERVO = 15;                 // pin para controlar el servomotor
    constexpr uint16_t TIEMPO_ACTIVACION = 1000;    // Tiempo (ms) para accionar el servomotor
    constexpr uint8_t ANGULO_PARADO = 90;             // angulo inicial del servo
    constexpr uint8_t GIRO_DERECHA = 120;              // Angulo al que llega el servo (está en función de la longitud del mecanismo)
    constexpr uint8_t GIRO_IZQUIERDA = 60;              // Angulo para gire al otro sentido

    // macros para el sensor de tiempo de vuelo
    constexpr uint8_t PINXSHUT = 32;                  // pin para la selección de dispositivo
    constexpr uint8_t PINXSHUT1= 16;
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
bool bandera_activacion_servo = true;
bool bandera_activacion_pulsos = true;
uint32_t TIEMPO_ACTUAL = 0;


/* =========================================================
                        CLASE MOTOR
    Clase base que controla un motor paso a paso mediante
    señales PUL (pulso), DIR (dirección) y ENA (enable)
========================================================= */

Servo servomotor;
Servo impulsor;

VL53L0X palillos;
VL53L0X tolva;

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
  Serial.begin(921600);

  // servomotor
  servomotor.attach(PIN_SERVO);
  servomotor.write(ANGULO_PARADO);

  // interrupcion para cuando no haya palillos. Será necesario checar si se queda con RISING o FALLING
  pinMode(PIN_LED, OUTPUT);

// time of flight sensor
  Wire.begin (PIN_I2C_SDA, PIN_I2C_SCL);
  pinMode(PINXSHUT, OUTPUT);
  pinMode(PINXSHUT1, OUTPUT);

  digitalWrite(PINXSHUT, false);
  digitalWrite(PINXSHUT1, true);
  Serial.println("Configurando sensor palillos como dirección 0x30...");
  palillos.init();
  palillos.setAddress(0x30);
  palillos.setTimeout(500);

  Serial.println("La distancia actual de medición es de 10cm para el despliegue de palillos.");

  digitalWrite(PINXSHUT, true);
  // digitalWrite(PINXSHUT1, false);
  Serial.println("Configurando sensor de la tolva como dirección 0x29...");
  tolva.init();
  tolva.setTimeout(500);

  digitalWrite(PINXSHUT, true);
  digitalWrite(PINXSHUT1, true);
  Serial.println("La distancia actual de medición es de 10cm en la tolva.");
  delay(100);
}

void loop()
{
  uint32_t distancia_palillos_calc = palillos.readRangeSingleMillimeters();
  if(palillos.timeoutOccurred())
  {
    Serial.println("Timeout en palillos!");
    digitalWrite(PIN_LED, !digitalRead(PIN_LED));
  }
  

  uint32_t distancia_tol_calc = tolva.readRangeSingleMillimeters();
  if(tolva.timeoutOccurred())
  {
    Serial.println("Timeout en tolva!");
    digitalWrite(PIN_LED, !digitalRead(PIN_LED));
  }
  

  if(DISTANCIA_TIJERAS >= distancia_palillos_calc)
  {
    if(bandera_activacion_pulsos)
    {
      pinMode(PIN_PUL, OUTPUT);
      digitalWrite(PIN_PUL, false);
      Serial.println("Deteniendo");
      Serial.print("Distancia medida (palillos): ");
      Serial.println(distancia_palillos_calc);
      bandera_activacion_pulsos = false;
      bandera_activacion_servo = true;
    }
  }
  else
  {
    if(bandera_activacion_servo)
    {
      impulsor.attach(PIN_PUL);
      impulsor.write(VEL_RPM);
      Serial.println("Avanzando");
      Serial.print("Distancia medida (tolva): ");
      Serial.println(distancia_tol_calc);
      bandera_activacion_servo = false;
      bandera_activacion_pulsos = true;
    }
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

  mover_servomotor();
}