# Máquina Multifuncional ITK-TT

Sistema de control y supervisión para una máquina multifuncional industrial, desarrollado para automatizar la configuración y ejecución de pruebas mediante una interfaz gráfica táctil.

El proyecto integra una aplicación de escritorio desarrollada con **React, TypeScript y Electron** con un sistema de control basado en **ESP32**, permitiendo la comunicación entre la interfaz de usuario y los actuadores de la máquina mediante comunicación serial.

La aplicación está diseñada para ejecutarse en una **Raspberry Pi con pantalla táctil**, proporcionando una interfaz intuitiva para que el operador pueda configurar parámetros, posicionar la máquina, ejecutar pruebas y monitorear su progreso.

---

## Características principales

* Interfaz gráfica táctil para operación de la máquina.
* Configuración de parámetros de prueba.
* Control de motores mediante ESP32.
* Posicionamiento de la máquina.
* Ejecución automatizada de pruebas.
* Seguimiento del progreso de las pruebas.
* Visualización del tiempo transcurrido y tiempo estimado.
* Comunicación serial entre la aplicación y el controlador ESP32.
* Aplicación de escritorio mediante Electron.
* Compatibilidad con Raspberry Pi.
* Arquitectura separada entre interfaz de usuario y control de hardware.

---

## Arquitectura del sistema

El sistema está dividido en tres componentes principales:

```text
┌─────────────────────────────────────┐
│          Interfaz de usuario        │
│                                     │
│     React + TypeScript + Vite       │
│                                     │
│  Configuración │ Posicionamiento    │
│  Ejecución     │ Monitoreo          │
└──────────────────┬──────────────────┘
                   │
                   │ Electron
                   │ Serial
                   ▼
┌─────────────────────────────────────┐
│              ESP32                  │
│                                     │
│     Control y lógica de máquina     │
│                                     │
│  Motores │ Sensores │ Limit Switch  │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│          Máquina Multifuncional     │
│                                     │
│       Actuadores y mecanismos       │
└─────────────────────────────────────┘
```

### Flujo de comunicación

1. El operador configura la prueba desde la interfaz.
2. La aplicación envía los parámetros al ESP32 mediante comunicación serial.
3. El ESP32 procesa la configuración y controla los motores.
4. Durante la ejecución, el ESP32 envía información de estado a la aplicación.
5. La interfaz actualiza el progreso y los indicadores de la prueba en tiempo real.
6. Al finalizar la prueba, el ESP32 notifica a la aplicación y el sistema muestra el resultado de la ejecución.

---

## Interfaz de usuario

La interfaz está desarrollada con tecnologías web modernas y posteriormente empaquetada como aplicación de escritorio mediante Electron.

### Tecnologías

* **React**
* **TypeScript**
* **Vite**
* **Tailwind CSS**
* **DaisyUI**
* **Electron**
* **Node.js**
* **SerialPort**

La aplicación cuenta con diferentes vistas para controlar las principales funciones de la máquina:

### Inicio

Pantalla principal desde la cual el operador puede acceder a las funciones de la máquina.

### Configuración de prueba

Permite establecer los parámetros necesarios para ejecutar una prueba, como:

* Número de ciclos.
* Velocidad de operación.
* Posiciones de trabajo.

### Posicionamiento

Permite posicionar manualmente los mecanismos de la máquina antes de iniciar una prueba.

### Ejecución de prueba

Durante la prueba se muestran elementos como:

* Progreso de la prueba.
* Ciclos completados.
* Tiempo transcurrido.
* Tiempo estimado.
* Estado de ejecución.

---

## Control del hardware

El control de la máquina se realiza mediante un **ESP32**, encargado de interactuar directamente con los elementos físicos del sistema.

El firmware incluye lógica para:

* Control de motores.
* Generación de pulsos.
* Control de dirección.
* Control de velocidad.
* Movimiento continuo.
* Movimiento por pasos.
* Pausa y reanudación.
* Detección de posiciones límite.
* Ejecución de ciclos de prueba.
* Comunicación de estados con la aplicación.

La lógica de control se encuentra dentro de:

```text
Programacion_ESP32/
```

---

## Comunicación serial

La comunicación entre la aplicación y el ESP32 se realiza mediante un puerto serial.

La aplicación utiliza **Node SerialPort** dentro del proceso principal de Electron para establecer la comunicación con el controlador.

Los datos intercambiados utilizan mensajes estructurados, permitiendo transmitir información como:

* Configuración de pruebas.
* Posiciones.
* Ciclos completados.
* Estado de la máquina.
* Finalización de pruebas.

De esta manera, la interfaz gráfica permanece desacoplada de la lógica de control del hardware.

---

## Estructura del proyecto

```text
Maquina-multifuncional-ITK-TT/
│
├── Programacion_ESP32/
│   └── Firmware y lógica de control del ESP32
│
├── electron/
│   └── Proceso principal de Electron
│       └── Comunicación serial y funciones del sistema
│
├── src/
│   ├── components/
│   ├── pages/
│   ├── assets/
│   └── ...
│
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
```

---

## Instalación y desarrollo

### Requisitos

Antes de comenzar, es necesario contar con:

* Node.js
* npm
* Git
* Arduino IDE para modificar el firmware del ESP32
* Electron

### Clonar el repositorio

```bash
git clone https://github.com/pqchacon/Maquina-multifuncional-ITK-TT.git
```

Entrar al proyecto:

```bash
cd Maquina-multifuncional-ITK-TT
```

Instalar las dependencias:

```bash
npm install
```

---

## Ejecutar en modo desarrollo

Para iniciar la interfaz durante el desarrollo:

```bash
npm run dev
```

Para ejecutar la aplicación utilizando Electron, utilizar la configuración correspondiente incluida en el proyecto.

---

## Generación de la aplicación

La aplicación puede empaquetarse mediante Electron Builder para generar una aplicación de escritorio.

Para el despliegue en Raspberry Pi se utiliza una compilación para arquitectura **ARM64**.

El resultado puede distribuirse como una aplicación ejecutable en el sistema operativo de la Raspberry Pi, evitando que el operador tenga que iniciar manualmente el entorno de desarrollo.

---

## Raspberry Pi

El sistema está diseñado para utilizarse en una **Raspberry Pi como computadora embebida de la máquina**.

La Raspberry Pi ejecuta:

```text
┌─────────────────────────┐
│       Raspberry Pi      │
│                         │
│   Raspberry Pi OS       │
│          │              │
│          ▼              │
│      Electron           │
│          │              │
│          ▼              │
│    React Application    │
│          │              │
│          ▼              │
│      USB / Serial       │
└──────────┬──────────────┘
           │
           ▼
         ESP32
```

Esto permite utilizar la misma aplicación como interfaz de usuario de la máquina sin necesidad de una computadora convencional.

---

## Tecnologías utilizadas

| Tecnología   | Uso                                     |
| ------------ | --------------------------------------- |
| React        | Desarrollo de la interfaz               |
| TypeScript   | Tipado y desarrollo de la aplicación    |
| Vite         | Herramienta de desarrollo y compilación |
| Tailwind CSS | Estilos de la interfaz                  |
| DaisyUI      | Componentes visuales                    |
| Electron     | Aplicación de escritorio                |
| Node.js      | Funciones del entorno de escritorio     |
| SerialPort   | Comunicación con el ESP32               |
| ESP32        | Control del hardware                    |
| Arduino      | Desarrollo del firmware                 |
| Raspberry Pi | Plataforma de ejecución                 |

---

## Objetivo del proyecto

El objetivo es proporcionar una interfaz de operación sencilla y robusta para una máquina automatizada, ocultando la complejidad del sistema de control y permitiendo que el operador interactúe con la máquina mediante una interfaz gráfica intuitiva.

El proyecto combina conceptos de:

* Desarrollo de software.
* Desarrollo de aplicaciones de escritorio.
* Interfaces gráficas.
* Automatización industrial.
* Sistemas embebidos.
* Comunicación serial.
* Control de motores.
* Integración hardware/software.

---

## Interfaz

> Agregar aquí capturas de pantalla de la interfaz y fotografías de la máquina.

Ejemplo:

```text
docs/
├── screenshots/
│   ├── inicio.png
│   ├── configuracion.png
│   ├── posicionamiento.png
│   └── prueba.png
│
└── machine/
    └── maquina.jpg
```

---

## Flujo general de operación

```text
        INICIO
           │
           ▼
   Configurar prueba
           │
           ▼
  Posicionar máquina
           │
           ▼
     Guardar posición
           │
           ▼
    Iniciar prueba
           │
           ▼
   ┌───────────────┐
   │ Ejecutar ciclo│
   └───────┬───────┘
           │
           ▼
    ¿Ciclos restantes?
       │          │
      Sí          No
       │          │
       └──────────┘
                  │
                  ▼
          Prueba finalizada
                  │
                  ▼
                 FIN
```

---

## Autor

**Antonio Chacón**

Proyecto de desarrollo e integración de software y hardware para automatización industrial.

---

## Estado del proyecto

Proyecto en desarrollo.

Las funcionalidades y arquitectura pueden continuar evolucionando conforme se incorporen nuevas capacidades de control, monitoreo y automatización.
