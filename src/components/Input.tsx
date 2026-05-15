import { forwardRef, type InputHTMLAttributes } from "react";

type InputProps = {
  name: string;
  placeholder: string;
  value: string;
  error?: string;
  decimals?: number;
} & InputHTMLAttributes<HTMLInputElement>;

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ name, placeholder, value, error, decimals, onChange, ...rest }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let val = e.target.value;

      // Solo números y punto
      val = val.replace(/[^0-9.]/g, "");

      // Evitar múltiples puntos
      const parts = val.split(".");

      if (parts.length > 2) {
        val = parts[0] + "." + parts.slice(1).join("");
      }

      // Limitar decimales
      if (decimals !== undefined && val.includes(".")) {
        const [integer, decimal] = val.split(".");
        val = `${integer}.${decimal.slice(0, decimals)}`;
      }

      // Crear nuevo evento con valor modificado
      const newEvent = {
        ...e,
        target: {
          ...e.target,
          value: val,
        },
      };

      onChange?.(newEvent as React.ChangeEvent<HTMLInputElement>);
    };

    return (
      <div className="flex flex-col">
        <label
          className={`input input-lg bg-base-300 ${
            error ? "input-error" : "input-warning"
          }`}
        >
          <input
            ref={ref}
            type="text"
            name={name}
            className="grow"
            placeholder={placeholder}
            value={value}
            inputMode="decimal"
            onChange={handleChange}
            {...rest}
          />
        </label>

        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
      </div>
    );
  },
);

export default Input;
