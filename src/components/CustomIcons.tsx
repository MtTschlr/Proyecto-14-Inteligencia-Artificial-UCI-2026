import React from 'react';
import '@flaticon/flaticon-uicons/css/regular/rounded.css';

interface IconProps {
  className?: string;
  size?: number;
}

const createIcon = (name: string): React.FC<IconProps> => {
  const Icon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
    <i
      aria-hidden="true"
      className={`fi-rr-${name} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        fontSize: size,
        width: size,
        height: size,
        lineHeight: 1,
      }}
    />
  );
  return Icon;
};

export const CameraIcon = createIcon('camera');
export const UploadIcon = createIcon('upload');
export const CheckIcon = createIcon('check');
export const AlertIcon = createIcon('triangle-warning');
export const PrinterIcon = createIcon('print');
export const PlusIcon = createIcon('plus');
export const HistoryIcon = createIcon('time-past');
export const SettingsIcon = createIcon('settings');
export const SwitchCameraIcon = createIcon('camera-rotate');
export const CloseIcon = createIcon('cross-small');
export const DownloadIcon = createIcon('download');
export const TrashIcon = createIcon('trash');
export const CameraOffIcon = createIcon('camera-slash');
export const AnalyzeIcon = createIcon('search-alt');

export const ScanIcon = createIcon('camera-viewfinder');
export const LeafIcon = createIcon('leaf');
export const SeedlingIcon = createIcon('seedling');
export const BadgeCheckIcon = createIcon('badge-check');
export const HourglassIcon = createIcon('hourglass-end');
export const WifiIcon = createIcon('wifi');
export const WifiOffIcon = createIcon('wifi-slash');
export const SearchIcon = createIcon('search');
export const EyeIcon = createIcon('eye');
export const EyeOffIcon = createIcon('eye-crossed');
export const ChevronLeftIcon = createIcon('angle-small-left');
export const ChevronRightIcon = createIcon('angle-small-right');
export const RulerIcon = createIcon('ruler-horizontal');
export const BoxIcon = createIcon('box');
export const TruckIcon = createIcon('truck-side');
export const CalendarIcon = createIcon('calendar');
export const InfoIcon = createIcon('info');
export const SparklesIcon = createIcon('sparkles');
export const PlugIcon = createIcon('plug-connection');
export const BugIcon = createIcon('bug');
export const ImagesIcon = createIcon('images');
export const BasketIcon = createIcon('basket');
export const FilterIcon = createIcon('filter');
export const TagIcon = createIcon('label');
export const BananaIcon = createIcon('banana');
