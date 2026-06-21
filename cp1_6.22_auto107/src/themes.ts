export interface Theme {
  name: string;
  colors: string[];
  background: string;
}

export const themes: Theme[] = [
  {
    name: '霓虹',
    colors: ['#ff007f', '#00ff88', '#7f00ff', '#ffd700', '#00bfff'],
    background: 'linear-gradient(135deg, #ff007f 0%, #7f00ff 100%)',
  },
  {
    name: '森林',
    colors: ['#2d3748', '#38a169', '#f6e05e', '#48bb78', '#9ae6b4'],
    background: 'linear-gradient(135deg, #2d3748 0%, #38a169 100%)',
  },
  {
    name: '海洋',
    colors: ['#3182ce', '#63b3ed', '#e2e8f0', '#2c5282', '#bee3f8'],
    background: 'linear-gradient(135deg, #3182ce 0%, #2c5282 100%)',
  },
  {
    name: '日落',
    colors: ['#dd6b20', '#ed8936', '#fbd38d', '#c05621', '#feebc8'],
    background: 'linear-gradient(135deg, #dd6b20 0%, #c05621 100%)',
  },
  {
    name: '极光',
    colors: ['#667eea', '#a78bfa', '#fbbf24', '#805ad5', '#f6e05e'],
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
];
