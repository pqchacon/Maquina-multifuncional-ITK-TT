import { createHashRouter } from "react-router-dom";
import Home from "./Home";
import ConfigurarPrueba from "./ConfigurarPrueba";
import PosicionarMaquina from "./PosicionarMaquina";
import CorrerPrueba from "./CorrerPrueba";

const router = createHashRouter([
  { path: "/", element: <Home /> },
  { path: "/configurar-prueba", element: <ConfigurarPrueba /> },
  { path: "/posicionar-maquina", element: <PosicionarMaquina /> },
  { path: "/configurar-prueba/correr-prueba", element: <CorrerPrueba /> },
]);

export default router;
