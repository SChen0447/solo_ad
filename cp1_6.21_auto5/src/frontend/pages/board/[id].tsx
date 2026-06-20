import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { getSocket, disconnectSocket } from '../utils/socket';
import { generateUserId, getAvatarUrl, User } from '../types';

const Board = dynamic(() => import('../components/Board'), { ssr: false });

const BoardPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [socket, setSocket] = useState<any>(null);

  useEffect(() => {
    let userId = localStorage.getItem('board_user_id');
    let userName = localStorage.getItem('board_user_name');
    if (!userId) {
      userId = generateUserId();
      localStorage.setItem('board_user_id', userId);
    }
    if (!userName) {
      const names = ['小明', '小红', '创意达人', '设计师', '产品经理', '灵感猎手'];
      userName = names[Math.floor(Math.random() * names.length)];
      localStorage.setItem('board_user_name', userName);
    }
    const user: User = {
      id: userId,
      name: userName,
      avatar: getAvatarUrl(userId),
    };
    setCurrentUser(user);
    const s = getSocket();
    setSocket(s);

    return () => {
      disconnectSocket();
    };
  }, []);

  if (!id || !currentUser || !socket) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ color: '#7f8c8d' }}>加载中...</div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>展板 - 灵感展板</title>
      </Head>
      <Board boardId={id as string} socket={socket} currentUser={currentUser} />
    </>
  );
};

export default BoardPage;
