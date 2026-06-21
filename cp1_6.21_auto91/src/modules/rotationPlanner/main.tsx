import React, { useState, useEffect } from 'react';
import { Calendar, AlertTriangle, TrendingUp, Info } from 'lucide-react';
import PlantingTimeline from './components/PlantingTimeline';
import { GanttPlot, Plot } from '@/types';

const RotationPlanner: React.FC = () => {
  const [ganttData, setGanttData] = useState<GanttPlot[]>([]);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [quarterRange, setQuarterRange] = useState(2);
  const [loading, setLoading] = useState(true);