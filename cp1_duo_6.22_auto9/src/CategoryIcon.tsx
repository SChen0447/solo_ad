import { IngredientCategory } from './types';

interface Props {
  category: IngredientCategory;
  size?: number;
}

const iconPaths: Record<IngredientCategory, JSX.Element> = {
  vegetable: (
    <g>
      <path
        d="M12 2C8 2 5 5 5 9c0 2.5 1.5 4.7 3.5 5.8L10 22l2-4 2 4 1.5-7.2C17.5 13.7 19 11.5 19 9c0-4-3-7-7-7z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 2c1.5 2 2 4 2 6M12 2c-1.5 2-2 4-2 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </g>
  ),
  meat: (
    <g>
      <path
        d="M4 14c0 3 2.5 5 5.5 5 1.3 0 2.5-.4 3.5-1l4-3.5c.8-.7 1.2-1.7 1.2-2.7 0-2-1.7-3.8-3.8-3.8-1 0-2 .4-2.7 1l-3.5 4C6.9 13.5 5.5 14 4 14z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="14" r="1.2" fill="currentColor" opacity="0.4" />
      <circle cx="13" cy="11" r="0.8" fill="currentColor" opacity="0.4" />
      <path
        d="M7 17c-1 0-2-1-2-2M18 8c1 0 2 1 2 2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </g>
  ),
  seafood: (
    <g>
      <path
        d="M3 12c0 4 4 7 9 7s9-3 9-7-4-7-9-7-9 3-9 7z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 5v14M6 8h12M6 16h12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M3 12H2M22 12h-1M12 2V1M12 23v-1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="15" cy="10" r="0.8" fill="currentColor" />
    </g>
  ),
  dairy: (
    <g>
      <path
        d="M5 8h14l-1 12H6L5 8z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 8V6c0-1 1-2 2-2h4c1 0 2 1 2 2v2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 13h8M8 17h5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="16" cy="16" r="1" fill="currentColor" opacity="0.3" />
    </g>
  ),
  grain: (
    <g>
      <path
        d="M12 2v20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M12 5c2 0 3.5-1 4-2-1 0-2.5.5-4 2zM12 8c2 0 3.5-1 4-2-1 0-2.5.5-4 2zM12 11c2 0 3.5-1 4-2-1 0-2.5.5-4 2z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M12 5c-2 0-3.5-1-4-2 1 0 2.5.5 4 2zM12 8c-2 0-3.5-1-4-2 1 0 2.5.5 4 2zM12 11c-2 0-3.5-1-4-2 1 0 2.5.5 4 2z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M8 22c0-1 2-2 4-2s4 1 4 2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </g>
  ),
  seasoning: (
    <g>
      <path
        d="M10 4h4l-1 5h-2l-1-5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 9h8v12c0 1-1 2-2 2H10c-1 0-2-1-2-2V9z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="4" r="1.2" fill="currentColor" opacity="0.5" />
      <path
        d="M11 14h2M11 17h2M11 20h2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M6 9h12"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </g>
  ),
  fruit: (
    <g>
      <path
        d="M12 6c-3.5 0-6 2.5-6 6 0 4 3 6 6 6s6-2 6-6c0-3.5-2.5-6-6-6z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 6V3c0 0 2 1 3 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M12 8c1 1 2.5 1 3 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <ellipse cx="10" cy="10" rx="1.5" ry="1" fill="currentColor" opacity="0.25" />
    </g>
  ),
  other: (
    <g>
      <rect
        x="4"
        y="7"
        width="16"
        height="12"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 11h16M9 7v12M15 7v12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M12 4v3M12 19v3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </g>
  ),
};

export default function CategoryIcon({ category, size = 20 }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0 }}
    >
      {iconPaths[category]}
    </svg>
  );
}
