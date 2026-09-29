// ================================================
// Para agregar una nueva diapositiva, solo agrega
// un objeto al array "slides" con:
//   - image: importa la imagen arriba y úsala aquí
//   - title: título de la diapositiva
//   - description: texto descriptivo
// ================================================

// Importa tus imágenes aquí, por ejemplo:
import MaquinaMultifuncional from "../assets/Maquina-multifuncional.png";
import MecanismosMoviles from "../assets/Mecanismos-moviles.png";
import MesaElevadora from "../assets/Mesa-elevadora.png";
import TorreMovil from "../assets/Torre-movil.png";
import ConfigurarPrueba from "../assets/Configurar-prueba.png";
import PosicionInicio from "../assets/Posicion-inicio.png";
import PosicionFinal from "../assets/Posicion-final.png";
import BorrarPosiciones from "../assets/Borrar-posiciones.png";
import CorrerPrueba from "../assets/Correr-prueba.png";

const slides = [
  {
    image: MaquinaMultifuncional,
    title: "Descripción general de la máquina",
    description:
      'La "Máquina Multifuncional ITK" es un dispositivo diseñado para ayudar en la realización de pruebas para diferentes\
       productos; tostadores, teteras, pedales y cualquier otra muestra que pueda adaptarse a su funcionamiento. En esta guía encontrarás una\
       breve descripción sobre la secuencia que debes seguir para utilizar esta máquina de manera efectiva.',
  },
  {
    image: MecanismosMoviles,
    title: "Posicionar la máquina",
    description:
      'Antes de iniciar una prueba, deberás colocar la muestra en la máquina. Para ello, puedes apoyarte de los mecanismos\
       móviles, los cuales podrás controlar desde el menú "Posicionar máquina."',
  },
  {
    image: MesaElevadora,
    title: "Mesa elevadora",
    description:
      "Ajusta la altura de la mesa elevadora según convenga a las dimensiones de tu muestra.",
  },
  {
    image: TorreMovil,
    title: "Torre móvil",
    description:
      "Aleja o acerca la torre móvil según convenga a las dimensiones de tu muestra.",
  },
  {
    image: ConfigurarPrueba,
    title: "Configurar una prueba",
    description:
      'Antes de iniciar una prueba deberás configurar los parámetros necesarios, tales como: el inicio y el final del recorrido\
       que debe realizar la prueba, número de ciclos, velocidad de movimiento, etc. Puedes hacer esto desde el menú\
        "Configurar prueba".',
  },
  {
    image: PosicionInicio,
    title: "Configurar inicio del recorrido",
    description:
      'Utiliza el panel "Control de Posición" para mover el mecanismo hasta la posición donde deseas que comience el recorrido\
       de la prueba que realizarás. Una vez alcanzada la posición deseada, presiona el botón "Guardar posición de inicio" para\
        establecerla como el punto inicial del recorrido.',
  },
  {
    image: PosicionFinal,
    title: "Configurar final del recorrido",
    description:
      'Repite el mismo proceso para guarda la posición final del recorrido, esta vez usaldo el botón "Guardar posición final".\
       La prueba oscilará entre las posiciones de inicio y final guardadas.\
       \nPuedes configurar el final antes de configurar el inicio o viceversa, el orden no afecta el funcionamiento de la máquina.',
  },
  {
    image: BorrarPosiciones,
    title: "Recetear posiciones",
    description:
      'En caso de no estar satisfecho con las posiciones que se guardaron podrás olvidarlas usando el botón "Borrar posiciones" y\
       repetir todo el proceso para guardar posiciones nuevas.',
  },
  {
    image: CorrerPrueba,
    title: "Correr prueba",
    description:
      'Una vez que inicies tu prueba podrás monitorearla desde esta ventana, la cual te mostrará el progreso de la misma, el\
       tiempo que durará, el tiempo y los ciclos transcurridos.\nDesde esta ventana también podrás pausar la prueba con el botón\
        de pausa o abortarla en cualquier momento usando el botón "Detener prueba".',
  },
];

function InfoCarousel() {
  return (
    <div className="carousel rounded-box w-full">
      {slides.map((slide, index) => (
        <div
          key={index}
          className="carousel-item flex-col w-full items-center gap-1 p-1"
        >
          {/* IMAGEN */}
          <img
            src={slide.image}
            alt={slide.title}
            className="w-full max-h-[55vh] object-contain rounded-xl"
          />

          {/* TEXTO */}
          <div className="text-justify max-w-xl">
            <h2 className="text-xl text-center font-bold mb-1">
              {slide.title}
            </h2>
            <p className="text-md whitespace-pre-line">{slide.description}</p>
          </div>

          {/* CONTADOR DE DIAPOSITIVA */}
          <p className="text-sm opacity-50">
            {index + 1} / {slides.length}
          </p>
        </div>
      ))}
    </div>
  );
}

export default InfoCarousel;
