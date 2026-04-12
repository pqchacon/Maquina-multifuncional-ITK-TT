type Props = {
  title?: string;
  children: React.ReactNode;
};

function Card({ title, children }: Props) {
  return (
    <div className="card bg-primary text-secondary-content w-full max-w-2xl">
      <div className="card-body items-center">
        {title && <h1 className="card-title">{title}</h1>}

        <div className="w-full flex flex-col items-center gap-2">
          {children}
        </div>
      </div>
    </div>
  );
}

export default Card;
