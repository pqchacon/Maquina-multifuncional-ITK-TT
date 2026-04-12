type ActionDisableButtonProps = {
  children: React.ReactNode;
  disabled: boolean;
  outline: boolean;
  name: string;

  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onPointerDown?: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerUp?: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerCancel?: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerLeave?: (e: React.PointerEvent<HTMLButtonElement>) => void;
};

function ActionDisableButton({
  onClick,
  onPointerUp,
  onPointerDown,
  onPointerCancel,
  onPointerLeave,
  children,
  outline,
  disabled,
  name,
}: ActionDisableButtonProps) {
  return (
    <button
      name={name}
      className={`btn btn-warning btn-lg disabled:bg-gray-400 disabled:text-gray-700 ${
        outline ? "btn-outline" : ""
      }`}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onPointerLeave={onPointerLeave}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export default ActionDisableButton;
