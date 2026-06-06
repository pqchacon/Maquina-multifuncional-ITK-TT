import ThemeController from "./ThemeController";
import { FaPowerOff } from "react-icons/fa6";

type FooterProps = {
  onShutdown?: () => void;
};

function Footer({ onShutdown }: FooterProps) {
  return (
    <footer className="w-full bg-neutral text-neutral-content px-4 py-2">
      <div className="flex items-center justify-between whitespace-nowrap gap-4">
        {/* IZQUIERDA */}
        <div className="flex items-center gap-3">
          {onShutdown && (
            <button className="btn btn-ghost" onClick={onShutdown}>
              <FaPowerOff size={24} color="white" />
            </button>
          )}
          <ThemeController />
        </div>

        {/* DERECHA */}

        <p className="text-sm">Version 2.0.1</p>
      </div>
    </footer>
  );
}

export default Footer;
