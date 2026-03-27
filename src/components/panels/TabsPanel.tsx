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
                {isLive && <div className="tabs-bar__live-dot" title="CURRENT PERFORMANCE PATCH" />}
                
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
    </div>
  );
}
