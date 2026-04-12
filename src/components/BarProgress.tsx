import { useContext } from "react";
import { temaOscuro, ThemeContext } from "../App";

interface Props {
  progreso: number;
}

function BarProgress({ progreso }: Props) {
  const { theme } = useContext(ThemeContext);

  return (
    <div className="w-full h-2 bg-gray-300 rounded-full overflow-hidden">
      <div
        className="h-full transition-all duration-500"
        style={{
          width: `${progreso}%`,
          backgroundColor: `#${theme === temaOscuro ? "14B2D5" : "0a213d"}`,
        }}
      />
    </div>
  );
}

export default BarProgress;
