import { createElement, type FC } from 'react';

export interface IconProps {
  className?: string;
  size?: number;
}

export const createIcon = (name: string): FC<IconProps> => {
  const Icon: FC<IconProps> = ({ className = '', size = 24 }) =>
    createElement('i', {
      'aria-hidden': true,
      className: `fi-rr-${name} ${className}`,
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        fontSize: size,
        width: size,
        height: size,
        lineHeight: 1,
      },
    });
  Icon.displayName = `Icon(${name})`;
  return Icon;
};
