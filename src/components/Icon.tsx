import '@flaticon/flaticon-uicons/css/bold/rounded.css';

interface IconProps {
  name: string;
  size?: number;
  className?: string;
}

export function Icon({ name, size = 20, className = '' }: IconProps) {
  return (
    <i
      aria-hidden="true"
      className={`fi-br-${name} inline-flex items-center justify-center shrink-0 leading-none ${className}`}
      style={{ fontSize: size, width: size, height: size }}
    />
  );
}
