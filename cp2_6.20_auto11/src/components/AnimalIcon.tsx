import React from 'react'

interface AnimalIconProps {
  species: 'dog' | 'cat' | 'rabbit' | 'other'
  size?: number
}

export const AnimalIcon: React.FC<AnimalIconProps> = ({ species, size = 80 }) => {
  const icons: Record<string, JSX.Element> = {
    dog: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M12 12c2.5 0 4.5-2 4.5-4.5S14.5 3 12 3 7.5 5 7.5 7.5 9.5 12 12 12z"
          fill="currentColor"
        />
        <path
          d="M4 14c0-2 2-4 4-4h8c2 0 4 2 4 4v3c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2v-3z"
          fill="currentColor"
        />
        <path d="M6 19v2c0 .6-.4 1-1 1s-1-.4-1-1v-2h2zM20 19v2c0 .6-.4 1-1 1s-1-.4-1-1v-2h2z" fill="currentColor" />
      </svg>
    ),
    cat: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M3 5l2 5h2L5 5l3 2 2-2-1 5h6l-1-5 2 2 3-2-2 5h2l2-5v8c0 3-2 6-7 6H9c-5 0-7-3-7-6V5z"
          fill="currentColor"
        />
      </svg>
    ),
    rabbit: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M9 2c-1 0-2 2-2 4v4H5c-1.7 0-3 1.3-3 3v5c0 2.2 1.8 4 4 4h12c2.2 0 4-1.8 4-4v-5c0-1.7-1.3-3-3-3h-2V6c0-2-1-4-2-4s-2 2-2 4v2h-2V6c0-2-1-4-2-4z"
          fill="currentColor"
        />
      </svg>
    ),
    other: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M12 3C7.6 3 4 6.6 4 11s3.6 8 8 8h1c2.8 0 5-2.2 5-5 0-1.7-.8-3.1-2-4.1C19.2 9.1 20 7.5 20 6c0-1.7-1.3-3-3-3-.9 0-1.7.4-2.3 1C13.9 3.4 13 3 12 3z"
          fill="currentColor"
        />
      </svg>
    )
  }

  return icons[species] || icons.other
}

export const speciesColors: Record<string, string> = {
  dog: '#FFE8CC',
  cat: '#E6F0FF',
  rabbit: '#FFE6F0',
  other: '#E6FFE6'
}

export const speciesIconColors: Record<string, string> = {
  dog: '#F5A623',
  cat: '#4A90D9',
  rabbit: '#E8679C',
  other: '#52C41A'
}
