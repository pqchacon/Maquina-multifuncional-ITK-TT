import { useEffect, useState, createContext } from "react";
import { RouterProvider } from "react-router-dom";
import router from "./pages";

export const temaClaro = "light";
export const temaOscuro = "dark";

type ThemeContextType = {
  theme: string;
  toggleTheme: () => void;
};

export const ThemeContext = createContext<ThemeContextType>({
  theme: temaClaro,
  toggleTheme: () => {},
});

function App() {
  const [theme, setTheme] = useState<string>(() => {
    return localStorage.getItem("theme") || temaClaro;
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === temaClaro ? temaOscuro : temaClaro);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <RouterProvider router={router} />
    </ThemeContext.Provider>
  );
}

export default App;
