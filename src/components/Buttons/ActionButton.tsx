type ActionButtonProps = {
  children: React.ReactNode;
  outline?: boolean; // mejor opcional
  ancho?: number;
  name: string;
  disabled?: boolean; // 👈 AGREGA ESTO
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onPointerDown?: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerUp?: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerCancel?: () => void; // ya que lo estás usando
  onPointerLeave?: () => void; // ya que lo estás usando
};

function ActionButton({
  outline,
  children,
  name,
  ancho,
  disabled,
  onClick,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  onPointerLeave,
}: ActionButtonProps) {
  return (
    <button
      name={name}
      disabled={disabled} // 👈 pásalo aquí
      className={`btn ${outline ? "btn-outline" : ""} btn-warning btn-lg ${ancho ? `w-${ancho}` : ""}`}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onPointerLeave={onPointerLeave}
    >
      {children}
    </button>
  );
}

export default ActionButton;
