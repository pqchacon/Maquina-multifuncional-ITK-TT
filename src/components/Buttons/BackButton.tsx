import { useNavigate } from "react-router-dom";
import { IoMdArrowRoundBack } from "react-icons/io";

type BackButtonProps = {
  onClick?: () => void;
  onClickExtra?: () => void;
  ruta: string;
};

function BackButton({ onClick, onClickExtra, ruta }: BackButtonProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick(); // abre modal
      return;
    }

    if (onClickExtra) {
      onClickExtra(); // ejecuta terminate si se usa directo
    }

    navigate(ruta);
  };

  return (
    <button className="btn btn-warning btn-neutral" onClick={handleClick}>
      <IoMdArrowRoundBack size={24} />
    </button>
  );
}

export default BackButton;
