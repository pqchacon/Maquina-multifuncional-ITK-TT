#include <Arduino.h>
#include <Wire.h>
#include <VL53L0X.h>
#include <ESP32Servo.h>

// ==========================================
// CLASE MOTOR CON INTERRUPCIÓN
// ==========================================
class Motor
{
  public:
    int PUL, DIR, ENA;
    int pulsosPorRevolucion;
    int reduccion;

    volatile bool estadoPulso = LOW;
    volatile unsigned long tiempoEntrePulsosUs = 0;
    volatile unsigned long ultimoPulsoUs = 0;

    volatile long posicionActual = 0;
    volatile int direccionActual = 1;

    volatile bool enMovimiento = false;
    volatile bool modoContinuo = false;

    Motor(int pul, int dir, int ena, int micro, int red)
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
    }

    unsigned long calcularTiempoEntrePulsos(float rpm)
    {
      if (rpm <= 0) return 0;
      return (unsigned long)(60000000.0 / (rpm * pulsosPorRevolucion * reduccion * 2));
    }

    void configurarDireccion(bool sentidoHorario)
    {
      digitalWrite(DIR, sentidoHorario ? HIGH : LOW);
      direccionActual = sentidoHorario ? 1 : -1;
    }

    void iniciarContinuo(float rpm, bool horario)
    {
      configurarDireccion(horario);
      tiempoEntrePulsosUs = calcularTiempoEntrePulsos(rpm);
      ultimoPulsoUs = micros();
      modoContinuo = true;
      enMovimiento = true;
    }

    void detener()
    {
      enMovimiento = false;
      digitalWrite(PUL, LOW);
    }

    inline void atenderPasosISR()
    {
      if (!enMovimiento) return;

      unsigned long ahora = micros();
      if (ahora - ultimoPulsoUs >= tiempoEntrePulsosUs)
      {
        ultimoPulsoUs += tiempoEntrePulsosUs;
        estadoPulso = !estadoPulso;
        digitalWrite(PUL, estadoPulso);

        if (estadoPulso == HIGH)
        {
          posicionActual += direccionActual;
        }
      }
    }
};

// ==========================================
// INSTANCIAS
// ==========================================
Motor motor(19, 18, 17, 800, 1);

VL53L0X sensor1;
VL53L0X sensor2;

#define XSHUT_1 15
#define XSHUT_2 16

// ==========================================
// SERVO
// ==========================================
Servo servo;
const int SERVO_PIN = 4;
const int UMBRAL_SENSOR2_MM = 1040;

// Tiempo que se espera para que el servo llegue a cada posición
const unsigned long TIEMPO_MOVIMIENTO_SERVO_MS = 600;

enum EstadoServo { SERVO_REPOSO, SERVO_YENDO_A_180, SERVO_YENDO_A_0 };
EstadoServo estadoServo = SERVO_REPOSO;
unsigned long inicioMovimientoServo = 0;
bool sensor2Activo = false;  // para detectar el flanco (no re-disparar mientras siga detectando)

void iniciarRutinaServo()
{
  servo.write(180);
  inicioMovimientoServo = millis();
  estadoServo = SERVO_YENDO_A_180;
}

void actualizarServo()
{
  unsigned long ahora = millis();

  switch (estadoServo)
  {
    case SERVO_YENDO_A_180:
      if (ahora - inicioMovimientoServo >= TIEMPO_MOVIMIENTO_SERVO_MS)
      {
        servo.write(0);
        inicioMovimientoServo = ahora;
        estadoServo = SERVO_YENDO_A_0;
      }
      break;

    case SERVO_YENDO_A_0:
      if (ahora - inicioMovimientoServo >= TIEMPO_MOVIMIENTO_SERVO_MS)
      {
        estadoServo = SERVO_REPOSO;
      }
      break;

    case SERVO_REPOSO:
    default:
      break;
  }
}

// ==========================================
// TIMER DE HARDWARE (ESP32 core v3.x)
// ==========================================
hw_timer_t *timer = NULL;

void IRAM_ATTR onTimer() {
  motor.atenderPasosISR();
}

// Muestreo de sensores
unsigned long ultimoMuestreoSensor = 0;
const unsigned long intervaloMuestreo = 80;

void setup()
{
  Serial.begin(115200);
  Wire.begin();
  Wire.setClock(400000);

  // Servo
  servo.setPeriodHertz(50);
  servo.attach(SERVO_PIN, 500, 2400);
  servo.write(0);

  pinMode(XSHUT_1, OUTPUT);
  pinMode(XSHUT_2, OUTPUT);

  digitalWrite(XSHUT_1, LOW);
  digitalWrite(XSHUT_2, LOW);
  delay(10);

  digitalWrite(XSHUT_1, HIGH);
  delay(10);
  if (!sensor1.init()) {
    Serial.println("Error en Sensor 1");
    while (1);
  }
  sensor1.setAddress(0x30);

  digitalWrite(XSHUT_2, HIGH);
  delay(10);
  if (!sensor2.init()) {
    Serial.println("Error en Sensor 2");
    while (1);
  }
  sensor2.setAddress(0x31);

  sensor1.setTimeout(500);
  sensor2.setTimeout(500);

  sensor1.startContinuous();
  sensor2.startContinuous();

  timer = timerBegin(1000000);
  timerAttachInterrupt(timer, &onTimer);
  timerAlarm(timer, 50, true, 0);
}

void loop()
{
  // La rutina del servo se actualiza en cada vuelta (no bloqueante)
  actualizarServo();

  unsigned long ahora = millis();
  if (ahora - ultimoMuestreoSensor >= intervaloMuestreo)
  {
    ultimoMuestreoSensor = ahora;

    // ---------- Sensor 1 -> motor ----------
    uint16_t distancia1 = sensor1.readRangeContinuousMillimeters();
    bool timeout1 = sensor1.timeoutOccurred();

    if (!timeout1 && distancia1 > 200)
    {
      if (!motor.enMovimiento)
      {
        motor.iniciarContinuo(100, true);
      }
    }
    else
    {
      if (motor.enMovimiento)
      {
        motor.detener();
      }
    }

    // ---------- Sensor 2 -> servo ----------
    uint16_t distancia2 = sensor2.readRangeContinuousMillimeters() * 10;
    bool timeout2 = sensor2.timeoutOccurred();

    bool detectado = (!timeout2 && distancia2 > UMBRAL_SENSOR2_MM);

    // Dispara solo en el flanco (de no detectar a detectar) y si el servo está libre
    if (detectado && !sensor2Activo && estadoServo == SERVO_REPOSO)
    {
      iniciarRutinaServo();
    }
    sensor2Activo = detectado;
  }
}