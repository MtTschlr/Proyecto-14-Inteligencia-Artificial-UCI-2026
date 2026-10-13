import React from 'react';

interface CornerGuidesProps {
  inset?: string;
  size?: string;
  color?: string;
}

export const CornerGuides: React.FC<CornerGuidesProps> = ({
  inset = 'inset-4',
  size = 'w-8 h-8',
  color = 'border-lima-300',
}) => (
  <div aria-hidden="true" className={`absolute ${inset} pointer-events-none`}>
    <span className={`absolute top-0 left-0 ${size} border-t-[3px] border-l-[3px] rounded-tl-xl ${color}`} />
    <span className={`absolute top-0 right-0 ${size} border-t-[3px] border-r-[3px] rounded-tr-xl ${color}`} />
    <span className={`absolute bottom-0 left-0 ${size} border-b-[3px] border-l-[3px] rounded-bl-xl ${color}`} />
    <span className={`absolute bottom-0 right-0 ${size} border-b-[3px] border-r-[3px] rounded-br-xl ${color}`} />
  </div>
);
