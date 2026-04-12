import BackButton from "./Buttons/BackButton";

type PropsNavbar = {
  children?: string;
  onClick?: () => void;
  ruta: string;
};

function Navbar({ children, onClick, ruta }: PropsNavbar) {
  return (
    <div className="navbar bg-neutral shadow-sm font-bold">
      <div className="navbar-start">
        <BackButton onClick={onClick} ruta={ruta} />
        <h1 className="text-primary-content text-lg ml-2">{children}</h1>
      </div>
      <div className="navbar-center"></div>
      <div className="navbar-end"></div>
    </div>
  );
}

export default Navbar;
