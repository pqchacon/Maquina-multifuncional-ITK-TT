import NavigateButton from "../components/Buttons/NavigateButton";
import Footer from "../components/Footert";
import IntertekLogoClaro from "../assets/LogoIntertekClaro.svg";
import IntertekLogoOscuro from "../assets/LogoIntertekOscuro.svg";
import { useContext } from "react";
import { temaOscuro, ThemeContext } from "../App";

function Home() {
  const { theme } = useContext(ThemeContext);

  return (
    <div className="min-h-screen flex flex-col">
      {/* CONTENIDO CENTRADO */}
      <div className="flex-1 flex flex-col items-center justify-center gap-5">
        {/* LOGO */}
        <img
          src={theme === temaOscuro ? IntertekLogoOscuro : IntertekLogoClaro}
          alt="Intertek logo"
          className="w-[380px] h-auto"
        />
        {/* BOTONES */}
        <div className="flex flex-col gap-2">
          <NavigateButton ruta="/configurar-prueba">
            Configurar Prueba
          </NavigateButton>
          <NavigateButton ruta="/posicionar-maquina">
            Posicionar Máquina
          </NavigateButton>
        </div>
      </div>
      {/* FOOTER ABAJO */}
      <Footer />
    </div>
  );
}
export default Home;
