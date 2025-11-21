import React from 'react';
import { Layout } from './components/Layout';
import { SplitViewChat } from './components/SplitViewChat';
import { WebSocketProvider } from './contexts/WebSocketContext';

function App() {
  return (
    <WebSocketProvider>
      <Layout>
        <SplitViewChat />
      </Layout>
    </WebSocketProvider>
  );
}

export default App;
