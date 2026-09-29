import { useNavigate } from "react-router-dom";
import ThemeController from "./ThemeController";
import { FaPowerOff } from "react-icons/fa6";
//import { GrInfo } from "react-icons/gr";
import { HiOutlineInformationCircle } from "react-icons/hi";

type FooterProps = {
  onShutdown?: () => void;
};

function Footer({ onShutdown }: FooterProps) {
  const navigate = useNavigate();

  return (
    <footer className="w-full bg-neutral text-neutral-content px-4 py-2">
      <div className="flex items-center justify-between whitespace-nowrap gap-4">
        {/* IZQUIERDA */}
        <div className="flex items-center">
          <ThemeController />
          <button
            className="btn btn-ghost"
            onClick={() => navigate("/guia-uso")}
          >
            <HiOutlineInformationCircle size={33} color="white" />
          </button>
        </div>

        {/* CENTRO */}
        <div className="flex-1 flex justify-center">
          {onShutdown && (
            <button className="btn btn-ghost" onClick={onShutdown}>
              <FaPowerOff size={24} color="white" />
            </button>
          )}
        </div>

        {/* DERECHA */}

        <p className="text-sm">Version 2.0.1</p>
      </div>
    </footer>
  );
}

export default Footer;
