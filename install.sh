#!/bin/bash

USER=$(awk -F: '$6 ~ /^\/home\// {print $1}' /etc/passwd)
CURRENT_DIRECTORY=/home/${USER}/
NEW_DIRECTORY=/home/${USER}/Documents/Scripts/
SERVICE_DIRECTORY=/etc/systemd/system/
SERVICE_NAME="Led_service.service"

clear
echo ""
echo "Script para hacer la instalación automática dentro de la Raspberry."
echo "del LED-dimmer. Será necesario ejecutarlo con sudo."
echo ""

## ----------------------------------------------------------------
## INSTALACIÓN DE LAS LIBRERÍAS NECESARIAS PARA LA RASPBERRY Y CORRER EL SCRIPT DE PYTHON
## ----------------------------------------------------------------
echo "Se instalarán las librerias necesarias para correr el script de python..."
apt install python3-gpiozero -y

if [ $? -ne 0 ]; then
    echo "Las librerías no fueron posibles de descargar. Asegurate de haber ejecutado este script como:"
    echo "  sudo ./install.sh"
    exit 1
fi

echo "Librerías instaladas!"
echo ""

## -----------------------------------------------------------------
## CREACIÓN DEL ACHIVO SERVICE
## -----------------------------------------------------------------
echo "Ahora se procede a crear el archivo .service..."
tee LED-Dimmer/${SERVICE_NAME} > /dev/null << EOF
[Unit]
Description=LED Dimmer script
After=network.target

[Service]
ExecStart=/usr/bin/python3 ${NEW_DIRECTORY}LEDs.py
Type=simple
EOF
echo "Archivo creado!"
echo ""
## -----------------------------------------------------------------
## MOVIMIENTO DE ARCHIVOS A LOS DIRECTORIOS CORRESPONDIENTES
## -----------------------------------------------------------------
echo "Moviendo archivos necesarios para activar el daemon..."
mkdir ${NEW_DIRECTORY}
cp LED-Dimmer/${SERVICE_NAME} ${SERVICE_DIRECTORY}
if [ $? -ne 0 ]; then   
    echo "Error. No se pudo copiar el archivo Led_service.service en el directorio:"
    echo ${SERVICE_DIRECTORY}
    exit 1
fi
cp LED-Dimmer/LEDs.py ${NEW_DIRECTORY}
if [ $? -ne 0 ]; then 
    echo "Error. No se pudo copiar el archivo 'LEDs.py' en el directorio:"
    echo ${NEW_DIRECTORY}
    exit 1
fi
echo "Se movieron correctamente los archivos!"
echo ""
## -----------------------------------------------------------------
## ACTIVACIÓN DEL SERVICIO
## -----------------------------------------------------------------
echo "Por último se activará el servicio..."
systemctl daemon-reload
systemctl enable ${SERVICE_NAME}
systemctl start ${SERVICE_NAME}
echo "Listo!"
echo "Ahora puedes reiniciar la Raspberry y probar el archivo"