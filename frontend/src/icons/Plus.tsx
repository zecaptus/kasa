import type { IconProps } from './type';

export const PlusIcon = ({ className }: IconProps) => {
  return (
    <svg viewBox="0 -960 960 960" fill="currentColor" className={className}>
      <title>PlusIcon</title>
      <path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z" />
    </svg>
  );
};
