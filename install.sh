#!/bin/bash

if [ "$EUID" -ne 0 ]; then
    echo "Ejecuta este script con: sudo ./install.sh"
    exit 1
fi

TARGET_USER="${SUDO_USER:-pi}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SRC_DIR="${SCRIPT_DIR}/LED-Dimmer"
NEW_DIRECTORY="/home/${TARGET_USER}/Documents/Scripts"
SERVICE_DIRECTORY="/etc/systemd/system"
SERVICE_NAME="Led_service.service"

clear
echo ""
echo "Instalación automática del LED-dimmer para el usuario: ${TARGET_USER}"
echo ""

## Librerías
echo "Instalando librerías..."
apt update && apt install -y python3-gpiozero
if [ $? -ne 0 ]; then
    echo "No se pudieron instalar las librerías. Revisa la conexión a internet."
    exit 1
fi
echo "Librerías instaladas!"
echo ""

## Verificar que exista el script de Python
if [ ! -f "${SRC_DIR}/LEDs.py" ]; then
    echo "Error: no se encontró ${SRC_DIR}/LEDs.py"
    exit 1
fi

## Copiar el script de Python
echo "Copiando LEDs.py..."
mkdir -p "${NEW_DIRECTORY}"
cp "${SRC_DIR}/LEDs.py" "${NEW_DIRECTORY}/" || { echo "Error al copiar LEDs.py"; exit 1; }
chown -R "${TARGET_USER}:${TARGET_USER}" "/home/${TARGET_USER}/Documents"
echo "Archivo copiado!"
echo ""

## Crear el servicio
echo "Creando ${SERVICE_NAME}..."
tee "${SERVICE_DIRECTORY}/${SERVICE_NAME}" > /dev/null << EOF
[Unit]
Description=LED Dimmer (fade continuo en GPIO 18)

[Service]
Type=simple
ExecStart=/usr/bin/python3 ${NEW_DIRECTORY}/LEDs.py
Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF
echo "Servicio creado!"
echo ""

## Activar el servicio
echo "Activando el servicio..."
systemctl daemon-reload
systemctl enable "${SERVICE_NAME}" || { echo "Error al habilitar el servicio"; exit 1; }
systemctl restart "${SERVICE_NAME}"
echo ""
echo "Listo! El LED ya debería estar haciendo el fade."
echo "Reinicia la Raspberry para comprobar que arranca solo."