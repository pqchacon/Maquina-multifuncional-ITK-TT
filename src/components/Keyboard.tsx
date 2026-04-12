import { forwardRef } from "react";

type Props = {
  onKeyPress: (value: string) => void;
  onBackspace: () => void;
  onEnter: () => void;
};

const keys: (string | "backspace" | "enter")[] = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "enter",
  "0",
  "backspace",
];

const NumericKeyboard = forwardRef<HTMLDivElement, Props>(
  ({ onKeyPress, onBackspace, onEnter }, ref) => {
    const handleClick = (key: (typeof keys)[number]) => {
      if (key === "backspace") return onBackspace();
      if (key === "enter") return onEnter();
      onKeyPress(key);
    };

    return (
      <div
        ref={ref}
        onPointerDown={(e) => e.stopPropagation()}
        className="
        fixed top-1/2 left-1/2
        -translate-x-1/2 -translate-y-1/2

        w-[400px] max-w-[90%]

        grid grid-cols-3 gap-3
        p-6

        z-[9999]

        bg-base-200/40
        backdrop-blur-md
        border border-white/10
        rounded-2xl
        shadow-2xl"
      >
        {keys.map((key) => (
          <button
            key={key}
            className="btn btn-warning text-xl py-4"
            onClick={() => handleClick(key)}
          >
            {key === "backspace" ? "⌫" : key === "enter" ? "OK" : key}
          </button>
        ))}
      </div>
    );
  },
);

export default NumericKeyboard;
