import { useNavigate } from "react-router-dom";
import React from "react";

type ButtonProps = {
  children: React.ReactNode;
  ruta: string;
  name: string;
  disable: boolean;
  dato?: string;
  onClick?: () => void;
};

function NavigateSendButton({
  children,
  ruta,
  name,
  disable,
  dato,
  onClick,
}: ButtonProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick(); // 👈 ejecuta primero la función externa
    }

    navigate(ruta, { state: { sendDato: dato } }); // 👈 luego navega
  };

  return (
    <button
      name={name}
      className="btn btn-warning btn-lg font-bold disabled:bg-gray-400 disabled:text-gray-700"
      disabled={disable}
      onClick={handleClick}
    >
      {children}
    </button>
  );
}

export default NavigateSendButton;
