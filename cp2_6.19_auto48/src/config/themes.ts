import { Theme } from '../types';

export const themes: Theme[] = [
  {
    id: 'ocean-blue',
    name: '海洋蓝',
    primaryColor: '#1890ff',
    backgroundColor: '#ffffff',
    textColors: ['#1890ff', '#096dd9', '#40a9ff', '#69c0ff', '#91d5ff'],
    panelBgColor: '#f0f7ff',
    inputBgColor: '#ffffff',
    textColor: '#333333'
  },
  {
    id: 'forest-green',
    name: '森林绿',
    primaryColor: '#52c41a',
    backgroundColor: '#ffffff',
    textColors: ['#52c41a', '#389e0d', '#73d13d', '#95de64', '#b7eb8f'],
    panelBgColor: '#f6ffed',
    inputBgColor: '#ffffff',
    textColor: '#333333'
  },
  {
    id: 'sunset-orange',
    name: '日落橙',
    primaryColor: '#fa8c16',
    backgroundColor: '#ffffff',
    textColors: ['#fa8c16', '#d46b08', '#ffa940', '#ffc069', '#ffd591'],
    panelBgColor: '#fff7e6',
    inputBgColor: '#ffffff',
    textColor: '#333333'
  },
  {
    id: 'sakura-pink',
    name: '樱花粉',
    primaryColor: '#eb2f96',
    backgroundColor: '#ffffff',
    textColors: ['#eb2f96', '#c41d7f', '#f759ab', '#ff85c0', '#ffadd2'],
    panelBgColor: '#fff0f6',
    inputBgColor: '#ffffff',
    textColor: '#333333'
  },
  {
    id: 'dark-night',
    name: '暗夜黑',
    primaryColor: '#722ed1',
    backgroundColor: '#1a1a2e',
    textColors: ['#722ed1', '#9254de', '#b37feb', '#d3adf7', '#efdbff'],
    panelBgColor: '#16213e',
    inputBgColor: '#0f3460',
    textColor: '#e8e8e8'
  }
];

export const defaultTheme = themes[0];
