import signal
import sys
from gpiozero import PWMLED


led = PWMLED(18, frequency=1000)  # 1 kHz para evitar parpadeo


def detener(signum, frame):
    # systemd envía SIGTERM al detener el servicio o al apagar la Raspberry
    sys.exit(0)


signal.signal(signal.SIGTERM, detener)

try:
    # Fade infinito: 1 s subiendo, 1 s bajando (n=None = sin fin)
    led.pulse(fade_in_time=2, fade_out_time=2, n=None, background=False)
finally:
    led.off()
    led.close()
