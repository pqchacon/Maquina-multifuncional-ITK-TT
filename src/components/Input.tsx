import { forwardRef, type InputHTMLAttributes } from "react";

type InputProps = {
  name: string;
  placeholder: string;
  value: string;
  error?: string;
} & InputHTMLAttributes<HTMLInputElement>;

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ name, placeholder, value, error, ...rest }, ref) => {
    return (
      <div className="flex flex-col">
        <label
          className={`input input-lg bg-base-300 ${
            error ? "input-error" : "input-warning"
          }`}
        >
          <input
            ref={ref} // 🔥 aquí va el ref
            type="text"
            name={name}
            className="grow"
            placeholder={placeholder}
            value={value}
            inputMode="numeric"
            {...rest}
          />
        </label>

        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
      </div>
    );
  },
);

export default Input;
