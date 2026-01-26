import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const URL = 'http://localhost:5000';

export const useSocket = (roomId: string, username: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    const newSocket = io(URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to backend');
      newSocket.emit('join_room', roomId);
    });

    newSocket.on('receive_message', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      newSocket.close();
    };
  }, [roomId]);

  const sendMessage = (text: string, targetLang: string) => {
    if (socket) {
      const messageData = {
        roomId,
        senderId: socket.id,
        username,
        text,
        targetLang,
        timestamp: new Date().toISOString(),
      };
      socket.emit('send_message', messageData);
    }
  };

  return { socket, messages, sendMessage };
};
