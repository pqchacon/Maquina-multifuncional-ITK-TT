import Output from "./Output";
import { useContext } from "react";
import { temaOscuro, ThemeContext } from "../App";

type RadialProgressProps = {
  ciclosTotales: number;
  ciclosCompletados: number;
};

function RadialProgress({
  ciclosTotales,
  ciclosCompletados,
}: RadialProgressProps) {
  const { theme } = useContext(ThemeContext);

  const porcentaje =
    ciclosTotales > 0 ? (ciclosCompletados / ciclosTotales) * 100 : 0;

  return (
    <div
      className="radial-progress"
      style={
        {
          "--value": porcentaje,
          "--size": "10rem",
          "--thickness": "0.7rem",
          color: `#${theme === temaOscuro ? "14B2D5" : "0a213d"}`,
        } as React.CSSProperties
      }
      aria-valuenow={porcentaje}
      role="progressbar"
    >
      <Output>
        {ciclosCompletados}/{ciclosTotales}
      </Output>
    </div>
  );
}

export default RadialProgress;
