import ThemeController from "./ThemeController";

function Footer() {
  return (
    <footer className="w-full bg-neutral text-neutral-content px-4 py-2">
      <div className="flex items-center justify-between whitespace-nowrap gap-4">
        {/* IZQUIERDA */}
        <div className="flex items-center">
          <ThemeController />
        </div>

        {/* DERECHA */}
        <p className="text-sm">Version 2.0.0</p>
      </div>
    </footer>
  );
}

export default Footer;
