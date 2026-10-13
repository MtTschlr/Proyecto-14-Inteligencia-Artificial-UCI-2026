import React from 'react';
import { getStateStyle } from '../lib/stateStyle';

interface StateBadgeProps {
  state: string;
  size?: 'sm' | 'md';
  withHint?: boolean;
}

export const StateBadge: React.FC<StateBadgeProps> = ({ state, size = 'sm', withHint = false }) => {
  const style = getStateStyle(state);
  const { Icon } = style;
  const sizing = size === 'md' ? 'gap-2 px-3.5 py-1.5 text-sm' : 'gap-1.5 px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center rounded-full font-semibold whitespace-nowrap ${sizing} ${style.soft}`}>
      <Icon size={size === 'md' ? 16 : 14} />
      {style.label}
      {withHint && <span className="font-normal opacity-80">· {style.hint}</span>}
    </span>
  );
};
