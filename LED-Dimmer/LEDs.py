from gpiozero import PWMLED
from time import sleep

# Configuración del LED en el pin GPIO 18 (ajusta según tu conexión)
led = PWMLED(18)

# Subir el brillo de 0 a 1 (0% a 100%)
for i in range(101):
    led.value = i / 100
    sleep(0.01)

# Bajar el brillo de 1 a 0
for i in range(100, -1, -1):
    led.value = i / 100
    sleep(0.01)

# Apagar el LED
led.off()