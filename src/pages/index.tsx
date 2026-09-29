import { createHashRouter } from "react-router-dom";
import Home from "./Home";
import ConfigurarPrueba from "./ConfigurarPrueba";
import PosicionarMaquina from "./PosicionarMaquina";
import CorrerPrueba from "./CorrerPrueba";
import GuiaUso from "./GuiaUso";

const router = createHashRouter([
  { path: "/", element: <Home /> },
  { path: "/configurar-prueba", element: <ConfigurarPrueba /> },
  { path: "/posicionar-maquina", element: <PosicionarMaquina /> },
  { path: "/configurar-prueba/correr-prueba", element: <CorrerPrueba /> },
  { path: "/guia-uso", element: <GuiaUso /> },
]);

export default router;
