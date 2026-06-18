export function CatAvatar({ size = 80 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#f0e6d3" />
      <polygon points="25,35 35,10 45,35" fill="#e8a87c" stroke="#d4956a" strokeWidth="1" />
      <polygon points="55,35 65,10 75,35" fill="#e8a87c" stroke="#d4956a" strokeWidth="1" />
      <ellipse cx="50" cy="55" rx="30" ry="25" fill="#f5c6a0" />
      <ellipse cx="38" cy="48" rx="4" ry="5" fill="#4a3728" />
      <ellipse cx="62" cy="48" rx="4" ry="5" fill="#4a3728" />
      <ellipse cx="39" cy="46" rx="1.5" ry="2" fill="#fff" />
      <ellipse cx="63" cy="46" rx="1.5" ry="2" fill="#fff" />
      <ellipse cx="50" cy="56" rx="3" ry="2" fill="#e8836b" />
      <line x1="15" y1="52" x2="35" y2="54" stroke="#d4956a" strokeWidth="1" />
      <line x1="15" y1="58" x2="35" y2="58" stroke="#d4956a" strokeWidth="1" />
      <line x1="65" y1="54" x2="85" y2="52" stroke="#d4956a" strokeWidth="1" />
      <line x1="65" y1="58" x2="85" y2="58" stroke="#d4956a" strokeWidth="1" />
    </svg>
  );
}

export function DogAvatar({ size = 80 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#f0e6d3" />
      <ellipse cx="25" cy="50" rx="12" ry="20" fill="#c69c6d" stroke="#b5895e" strokeWidth="1" />
      <ellipse cx="75" cy="50" rx="12" ry="20" fill="#c69c6d" stroke="#b5895e" strokeWidth="1" />
      <ellipse cx="50" cy="55" rx="30" ry="28" fill="#dbb68f" />
      <circle cx="38" cy="47" r="5" fill="#4a3728" />
      <circle cx="62" cy="47" r="5" fill="#4a3728" />
      <circle cx="39" cy="45" r="2" fill="#fff" />
      <circle cx="63" cy="45" r="2" fill="#fff" />
      <ellipse cx="50" cy="58" rx="5" ry="4" fill="#4a3728" />
      <path d="M 44 64 Q 50 72 56 64" fill="none" stroke="#4a3728" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="50" cy="68" rx="8" ry="5" fill="#e8836b" opacity="0.6" />
    </svg>
  );
}

export function RabbitAvatar({ size = 80 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#f0e6d3" />
      <ellipse cx="38" cy="18" rx="8" ry="22" fill="#e8d5c4" stroke="#d4c0ad" strokeWidth="1" />
      <ellipse cx="62" cy="18" rx="8" ry="22" fill="#e8d5c4" stroke="#d4c0ad" strokeWidth="1" />
      <ellipse cx="38" cy="18" rx="4" ry="16" fill="#f0b8b8" />
      <ellipse cx="62" cy="18" rx="4" ry="16" fill="#f0b8b8" />
      <ellipse cx="50" cy="58" rx="28" ry="26" fill="#f0e0d0" />
      <circle cx="38" cy="50" r="4" fill="#4a3728" />
      <circle cx="62" cy="50" r="4" fill="#4a3728" />
      <circle cx="39" cy="48" r="1.5" fill="#fff" />
      <circle cx="63" cy="48" r="1.5" fill="#fff" />
      <ellipse cx="50" cy="58" rx="3" ry="2.5" fill="#e8836b" />
      <line x1="20" y1="56" x2="38" y2="57" stroke="#d4c0ad" strokeWidth="1" />
      <line x1="20" y1="60" x2="38" y2="60" stroke="#d4c0ad" strokeWidth="1" />
      <line x1="62" y1="57" x2="80" y2="56" stroke="#d4c0ad" strokeWidth="1" />
      <line x1="62" y1="60" x2="80" y2="60" stroke="#d4c0ad" strokeWidth="1" />
    </svg>
  );
}

export function getPetAvatar(species: string, size = 80) {
  switch (species) {
    case 'cat':
      return <CatAvatar size={size} />;
    case 'dog':
      return <DogAvatar size={size} />;
    case 'rabbit':
      return <RabbitAvatar size={size} />;
    default:
      return <CatAvatar size={size} />;
  }
}
