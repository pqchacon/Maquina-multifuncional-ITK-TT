type OutputProps = {
  children: React.ReactNode;
  size?: string;
};

function Output({ children, size }: OutputProps) {
  return (
    <div className={`badge badge-warning text-warning-content ${size}`}>
      {children}
    </div>
  );
}

export default Output;
