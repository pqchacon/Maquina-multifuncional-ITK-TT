import { useNavigate } from "react-router-dom";

type ButtonProps = {
  children: React.ReactNode;
  ruta: string;
  onClickExtra?: () => void;
};

function NavigateButton({ children, ruta, onClickExtra }: ButtonProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClickExtra) {
      onClickExtra(); // 🔥 Ejecuta terminate
    }

    navigate(ruta); // 🔥 Luego navega
  };

  return (
    <button className="btn btn-warning btn-lg font-bold" onClick={handleClick}>
      {children}
    </button>
  );
}

export default NavigateButton;
