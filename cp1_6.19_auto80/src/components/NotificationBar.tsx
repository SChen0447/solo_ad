import { useState, useEffect } from 'react';
import { usePetStore } from '../store/petStore';

const TIPS = [
  '你的小猫咪饿了',
  '小狗想出去玩了',
  '小兔子需要清洁了',
  '记得照顾你的宠物哦',
  '宠物的快乐度需要关注',
  '使用道具可以快速恢复状态',
  '让宠物们互相互动吧',
  '商店里有新道具上架了',
  '健康指数过低要注意了',
  '宠物们需要你的关爱',
];

export default function NotificationBar() {
  const [currentTip, setCurrentTip] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimating(true);
      setTimeout(() => {
        setCurrentTip((prev) => (prev + 1) % TIPS.length);
        setAnimating(false);
      }, 500);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      position: 'fixed',
      top: '60px',
      left: 0,
      right: 0,
      height: '40px',
      background: '#2c3e50',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '14px',
      fontWeight: 600,
      zIndex: 998,
      overflow: 'hidden',
    }}>
      <div
        className={animating ? 'notification-slide-out' : 'notification-slide-in'}
        style={{ whiteSpace: 'nowrap' }}
      >
        💡 {TIPS[currentTip]}
      </div>
    </div>
  );
}
