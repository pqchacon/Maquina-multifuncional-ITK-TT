import { useContext } from "react";
import { ThemeContext, temaOscuro } from "../App";
import Navbar from "../components/Navbar";
import Card from "../components/Card";
import InfoCarousel from "../components/InfoCarousel";

import FondoIntertekClaro from "../assets/FondoIntertekClaro.jpg";
import FondoIntertekOscuro from "../assets/FondoIntertekOscuro.jpg";

function GuiaUso() {
  const { theme } = useContext(ThemeContext);

  return (
    <>
      <Navbar ruta="/">Guia de Uso</Navbar>

      <main className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div
          className="absolute inset-0 bg-cover bg-[position:78%_15%]"
          style={
            theme === temaOscuro
              ? { backgroundImage: `url(${FondoIntertekOscuro})` }
              : { backgroundImage: `url(${FondoIntertekClaro})` }
          }
        />

        <div className="absolute inset-0 bg-black/50" />

        <div className="relative z-10 w-full flex flex-col items-center gap-10">
          <Card>
            <InfoCarousel />
          </Card>
        </div>
      </main>
    </>
  );
}

export default GuiaUso;
