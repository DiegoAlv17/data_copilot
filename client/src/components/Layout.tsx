import React, { useState } from 'react';
import { Menu, X, MessageSquare, BarChart2, Settings, Activity } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  sidebarContent: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children, sidebarContent }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background text-text overflow-hidden">
      {/* Mobile sidebar overlay */}
      <div 
        className={`fixed inset-0 bg-black/50 z-40 lg:hidden ${isSidebarOpen ? "block" : "hidden"}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Sidebar - Colapsado por defecto */}
      <aside 
        className={`fixed lg:static inset-y-0 left-0 z-50 bg-[#202123] transform transition-all duration-200 ease-in-out flex flex-col ${isSidebarOpen ? "w-64 translate-x-0" : "w-0 -translate-x-full lg:translate-x-0"}`}
      >
        <div className={`p-4 flex-1 overflow-y-auto ${isSidebarOpen ? "" : "hidden"}`}>
          <button className="flex items-center gap-3 w-full px-3 py-3 rounded-md border border-white/20 hover:bg-white/5 transition-colors text-sm text-white mb-4">
            <MessageSquare size={16} />
            Nueva conversación
          </button>
          
          <div className="flex flex-col gap-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-300 px-3 py-2">Hoy</div>
            <div className="text-xs text-gray-400 px-3">Historial próximamente...</div>
          </div>
        </div>

        <div className={`p-2 border-t border-white/10 ${isSidebarOpen ? "" : "hidden"}`}>
          <button className="flex items-center gap-3 w-full px-3 py-3 rounded-md hover:bg-white/5 transition-colors text-sm text-white">
            <Settings size={16} />
            Configuración
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full relative">
        {/* Header con botón de toggle sidebar */}
        <header className="h-12 flex items-center justify-between px-4 border-b border-white/10">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="text-text-secondary hover:text-white transition-colors"
          >
            <Menu size={24} />
          </button>
          <span className="font-medium">Data Copilot - BI Agent</span>
          <div className="w-6" /> {/* Spacer */}
        </header>

        <div className="flex-1 overflow-hidden relative">
          {children}
        </div>
      </main>
    </div>
  );
};
