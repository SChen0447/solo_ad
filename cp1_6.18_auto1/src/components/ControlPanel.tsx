import { useEffect } from 'react';
import { useControls, button, Leva, folder } from 'leva';
import { TreeType } from '../hooks/useTreeData';

export interface ControlPanelParams {
  treeType: TreeType;
  nodeScale: number;
  lineOpacity: number;
  autoRotateSpeed: number;
  flyDuration: number;
}

interface ControlPanelProps {
  params: ControlPanelParams;
  onChange: (params: ControlPanelParams) => void;
  onResetCamera: () => void;
}

export function ControlPanel({ params, onChange, onResetCamera }: ControlPanelProps) {
  const [, setControls] = useControls(() => ({
    场景设置: folder({
      树类型: {
        value: params.treeType,
        options: [
          { label: '公司组织架构', value: 'company' },
          { label: '生物学分类', value: 'biology' },
          { label: '知识图谱', value: 'knowledge' },
        ],
        label: '数据源',
      },
      节点大小缩放: {
        value: params.nodeScale,
        min: 0.5,
        max: 2.0,
        step: 0.1,
      },
      连线透明度: {
        value: params.lineOpacity,
        min: 0.1,
        max: 1.0,
        step: 0.05,
      },
    }),
    动画设置: folder({
      自动旋转速度: {
        value: params.autoRotateSpeed,
        min: 0,
        max: 5,
        step: 0.5,
        label: '°/秒',
      },
      摄像机飞入速度: {
        value: params.flyDuration,
        min: 0.5,
        max: 3.0,
        step: 0.1,
        label: '秒',
      },
    }),
    操作: folder({
      重置视角: button(() => onResetCamera()),
    }),
  }), [params, onResetCamera]);

  useEffect(() => {
    const unsubscribe = setControls({
      树类型: params.treeType,
      节点大小缩放: params.nodeScale,
      连线透明度: params.lineOpacity,
      自动旋转速度: params.autoRotateSpeed,
      摄像机飞入速度: params.flyDuration,
    });
    return unsubscribe;
  }, [params, setControls]);

  return null;
}

export function ControlPanelWrapper() {
  return (
    <Leva
      theme={{
        colors: {
          accent1: '#00AAFF',
          accent2: '#0088CC',
          accent3: '#006699',
          highlight1: '#EEEEEE',
          highlight2: '#CCCCCC',
          highlight3: '#AAAAAA',
          elevation1: 'rgba(0,0,0,0.7)',
          elevation2: 'rgba(20,20,20,0.8)',
          elevation3: 'rgba(40,40,40,0.9)',
        },
      }}
      collapsed
      fill={false}
      flat
      oneLineLabels
    />
  );
}
