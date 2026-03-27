'use client';

import React, { useState } from 'react';
import { useGraphStore } from '@/store/graphStore';
import { Plus, X, Radio } from 'lucide-react';

export default function TabsPanel() {
  const tabs = useGraphStore((s) => s.tabs);
  const activeTabId = useGraphStore((s) => s.activeTabId);
  const liveTabId = useGraphStore((s) => s.liveTabId);
  const addTab = useGraphStore((s) => s.addTab);
  const removeTab = useGraphStore((s) => s.removeTab);
  const switchTab = useGraphStore((s) => s.switchTab);
  const renameTab = useGraphStore((s) => s.renameTab);
  const goLive = useGraphStore((s) => s.goLive);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleStartRename = (e: React.MouseEvent, id: string, currentName: string) => {
    e.stopPropagation();
    setEditingId(id);
    setEditingName(currentName);
  };

  const handleRenameSubmit = () => {
    if (editingId && editingName.trim()) {
      renameTab(editingId, editingName.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="tabs-bar">
      <div className="tabs-bar__container">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const isLive = tab.id === liveTabId;

          return (
            <div
              key={tab.id}
              className={`tabs-bar__tab ${isActive ? 'tabs-bar__tab--active' : ''}`}
              onClick={() => switchTab(tab.id)}
            >
              <div className="tabs-bar__tab-content">
                {isLive && <div className="tabs-bar__live-dot" title="LIVE SOURCE" />}
                
                {editingId === tab.id ? (
                  <input
                    autoFocus
                    className="tabs-bar__input"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={handleRenameSubmit}
                    onKeyDown={(e) => e.key === 'Enter' && handleRenameSubmit()}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="tabs-bar__name" onDoubleClick={(e) => handleStartRename(e, tab.id, tab.name)}>
                    {tab.name}
                  </span>
                )}
              </div>

              <div className="tabs-bar__actions">
                {isActive && !isLive && (
                  <button 
                    className="tabs-bar__live-btn" 
                    onClick={(e) => { e.stopPropagation(); goLive(tab.id); }}
                    title="Promote to Performance"
                  >
                    <Radio size={8} />
                    <span>LIVE</span>
                  </button>
                )}
                
                {tabs.length > 1 && (
                  <button 
                    className="tabs-bar__close-btn" 
                    onClick={(e) => { e.stopPropagation(); removeTab(tab.id); }}
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
        
        <button className="tabs-bar__add-btn" onClick={() => addTab()} title="New Project Tab">
          <Plus size={14} />
        </button>
      </div>

      <style jsx>{`
        .tabs-bar {
          background: var(--bg-deep);
          height: 34px;
          border-bottom: 1px solid var(--border-subtle);
          display: flex;
          flex-direction: row;
          align-items: center;
          width: 100%;
          user-select: none;
          z-index: 200;
          overflow: hidden;
        }

        .tabs-bar__container {
          display: flex;
          flex-direction: row;
          align-items: center;
          height: 100%;
          gap: 0;
          overflow-x: auto;
          scrollbar-width: none;
        }

        .tabs-bar__container::-webkit-scrollbar {
          display: none;
        }

        .tabs-bar__tab {
          height: 34px;
          min-width: 100px;
          max-width: 200px;
          padding: 0 12px;
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
          background: transparent;
          cursor: pointer;
          position: relative;
          transition: all 0.1s ease;
          gap: 8px;
          border-right: 1px solid var(--border-subtle);
          flex-shrink: 0;
        }

        .tabs-bar__tab:hover {
          background: var(--bg-hover);
        }

        .tabs-bar__tab--active {
          background: var(--bg-primary);
          border-bottom: 2px solid var(--accent-primary);
        }

        .tabs-bar__tab-content {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 6px;
          flex: 1;
          overflow: hidden;
        }

        .tabs-bar__name {
          font-size: 11px;
          font-weight: 500;
          color: var(--text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .tabs-bar__tab--active .tabs-bar__name {
          color: var(--text-primary);
          font-weight: 600;
        }

        .tabs-bar__input {
          background: transparent;
          border: none;
          color: var(--text-primary);
          font-family: var(--font-sans);
          font-size: 11px;
          width: 100%;
          outline: none;
        }

        .tabs-bar__actions {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 4px;
          margin-left: 4px;
        }

        .tabs-bar__live-dot {
          width: 6px;
          height: 6px;
          background: #ff4444;
          border-radius: 50%;
          box-shadow: 0 0 6px rgba(255, 68, 68, 0.4);
          animation: pulse-live 1.5s infinite;
          flex-shrink: 0;
        }

        .tabs-bar__close-btn {
          opacity: 0;
          color: var(--text-tertiary);
          border: none;
          background: transparent;
          cursor: pointer;
          border-radius: 2px;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
        }

        .tabs-bar__tab:hover .tabs-bar__close-btn {
          opacity: 1;
        }

        .tabs-bar__close-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .tabs-bar__live-btn {
          background: rgba(234, 179, 8, 0.1);
          border: 1px solid rgba(234, 179, 8, 0.3);
          color: #eab308;
          font-size: 8px;
          font-weight: 800;
          padding: 1px 4px;
          border-radius: 2px;
          height: 14px;
          display: flex;
          align-items: center;
          gap: 2px;
        }

        .tabs-bar__add-btn {
          width: 34px;
          height: 34px;
          background: transparent;
          border: none;
          color: var(--text-tertiary);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
        }

        .tabs-bar__add-btn:hover {
          color: white;
          background: var(--bg-hover);
        }

        @keyframes pulse-live {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.95); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
