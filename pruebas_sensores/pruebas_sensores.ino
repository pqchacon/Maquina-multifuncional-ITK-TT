#include <Wire.h>
#include <VL53L0X.h>

VL53L0X sensor1;
VL53L0X sensor2;

#define XSHUT_1 16
#define XSHUT_2 17

void setup()
{
  Serial.begin(9600);
  Wire.begin();

  pinMode(XSHUT_1, OUTPUT);
  pinMode(XSHUT_2, OUTPUT);

  // Apagamos ambos sensores
  digitalWrite(XSHUT_1, LOW);
  digitalWrite(XSHUT_2, LOW);
  delay(10);

  // Encendemos el sensor 1
  digitalWrite(XSHUT_1, HIGH);
  delay(10);

  if (!sensor1.init())
  {
    Serial.println("Error al inicializar sensor 1");
    while (1) {}
  }

  // Cambiamos la dirección del sensor 1
  sensor1.setAddress(0x30);

  // Encendemos el sensor 2
  digitalWrite(XSHUT_2, HIGH);
  delay(10);

  if (!sensor2.init())
  {
    Serial.println("Error al inicializar sensor 2");
    while (1) {}
  }

  // Cambiamos la dirección del sensor 2
  sensor2.setAddress(0x31);

  sensor1.setTimeout(500);
  sensor2.setTimeout(500);

  // Iniciamos medición continua en ambos
  sensor1.startContinuous();
  sensor2.startContinuous();
}

void loop()
{
  uint16_t distancia1 = sensor1.readRangeContinuousMillimeters();
  uint16_t distancia2 = sensor2.readRangeContinuousMillimeters()*10;

  Serial.print("Sensor 1: ");
  Serial.print(distancia1);

  if (sensor1.timeoutOccurred())
  {
    Serial.print(" TIMEOUT");
  }

  Serial.print(" mm | ");

  Serial.print("Sensor 2: ");
  Serial.print(distancia2);

  if (sensor2.timeoutOccurred())
  {
    Serial.print(" TIMEOUT");
  }

  Serial.println(" mm");

  delay(10);
}