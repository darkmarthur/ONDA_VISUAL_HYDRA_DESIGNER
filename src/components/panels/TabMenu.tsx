'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Activity, 
  Layers, 
  Filter, 
  Box, 
  Zap, 
  Monitor, 
  Search,
  Grid,
  Sun,
  Video,
  Sliders,
  Braces,
  Music
} from 'lucide-react';
import { hydraFunctionRegistry, categoryMeta } from '@/hydra/registry';
import { useGraphStore } from '@/store/graphStore';
import { HydraCategory } from '@/hydra/types';

const CategoryIcon = ({ category, size = 14 }: { category: string; size?: number }) => {
  switch (category) {
    case 'source': return <Zap size={size} />;
    case 'geometry': return <Box size={size} />;
    case 'color': return <Sun size={size} />;
    case 'blend': return <Layers size={size} />;
    case 'modulate': return <Activity size={size} />;
    case 'output': return <Monitor size={size} />;
    case 'externalSource': return <Video size={size} />;
    case 'settings': return <Sliders size={size} />;
    case 'array': return <Braces size={size} />;
    case 'audio': return <Music size={size} />;
    default: return <Grid size={size} />;
  }
};

interface TabMenuProps {
  onClose: () => void;
  insertEdgeId?: string;
  spawnPosition?: { x: number; y: number };
}

const CATEGORIES: { key: HydraCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'source', label: 'Source' },
  { key: 'geometry', label: 'Geometry' },
  { key: 'color', label: 'Color' },
  { key: 'blend', label: 'Blend' },
  { key: 'modulate', label: 'Modulate' },
  { key: 'externalSource', label: 'External' },
  { key: 'settings', label: 'Settings' },
  { key: 'array', label: 'Array' },
  { key: 'audio', label: 'Audio' },
  { key: 'output', label: 'Output' },
];

export default function TabMenu({ onClose, insertEdgeId, spawnPosition }: TabMenuProps) {
  const [activeCategory, setActiveCategory] = useState<HydraCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const addNode = useGraphStore((s) => s.addNode);
  const insertNodeOnEdge = useGraphStore((s) => s.insertNodeOnEdge);
  const addAndConnectNode = useGraphStore((s) => s.addAndConnectNode);
  const activeDraftConnection = useGraphStore((s) => s.activeDraftConnection);
  const setActiveDraftConnection = useGraphStore((s) => s.setActiveDraftConnection);
  const { addOutputNode } = require('@/store/graphStore');
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = useMemo(() => {
    let list: any[] = [...hydraFunctionRegistry];
    
    // Also inject Output pseudo-functions
    const outputFns = ['o0', 'o1', 'o2', 'o3'].map(buf => ({
      name: `out(${buf})`,
      type: 'output',
      category: 'output' as HydraCategory,
      description: `Output buffer ${buf}`,
      isOutput: true,
      buffer: buf
    }));
    
    list = [...list, ...outputFns as any];

    if (insertEdgeId) {
      list = list.filter((fn) => 
        !fn.isOutput && fn.category !== 'source'
      );
    }

    if (activeDraftConnection) {
      if (activeDraftConnection.handleType === 'source') {
        // We are pulling from an output, need a node that can receive an input
        list = list.filter((fn) => fn.type !== 'src');
      } else if (activeDraftConnection.handleType === 'target') {
        // We are pulling from an input (backwards), need a node that can produce an output
        list = list.filter((fn) => !fn.isOutput);
      }
    }

    if (activeCategory !== 'all') {
      list = list.filter((fn) => fn.category === activeCategory);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((fn) => fn.name.toLowerCase().includes(q));
    }

    return list;
  }, [activeCategory, search]);

  useEffect(() => {
    setSelectedIndex(0); // Reset selection on filter change
  }, [results.length]);

  const handleSelect = (fn: any) => {
    if (insertEdgeId) {
      insertNodeOnEdge(insertEdgeId, fn.name);
      onClose();
      return;
    }

    const offset = Math.random() * 40;
    const x = spawnPosition?.x ?? (window.innerWidth / 2 - 100 + offset);
    const y = spawnPosition?.y ?? (window.innerHeight / 2 - 50 + offset);

    if (activeDraftConnection) {
      if (fn.isOutput) {
        const { addAndConnectOutputNode } = require('@/store/graphStore');
        addAndConnectOutputNode(fn.buffer as any, { x, y }, activeDraftConnection);
      } else {
        addAndConnectNode(fn.name, { x, y }, activeDraftConnection);
      }
      setActiveDraftConnection(null);
      onClose();
      return;
    }

    if (fn.isOutput) {
      addOutputNode(fn.buffer as any, { x, y });
    } else {
      addNode(fn.name, { x, y });
    }
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setActiveDraftConnection(null);
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
      scrollToIndex(selectedIndex + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      scrollToIndex(selectedIndex - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      }
    } else if (e.key === 'Tab') {
      // Cycle categories
      e.preventDefault();
      const currentIdx = CATEGORIES.findIndex(c => c.key === activeCategory);
      const nextIdx = (currentIdx + 1) % CATEGORIES.length;
      setActiveCategory(CATEGORIES[nextIdx].key);
    }
  };

  const scrollToIndex = (index: number) => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll('.tab-menu__item');
    const target = items[index] as HTMLElement;
    if (target) {
      target.scrollIntoView({ block: 'nearest' });
    }
  };

  // Prevent clicks from bubling to canvas pane click
  const handleBackdropClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveDraftConnection(null);
    onClose();
  };

  return (
    <div className="tab-menu__backdrop" onClick={handleBackdropClick}>
      <div 
        className="tab-menu__container" 
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="tab-menu__categories">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              className={`tab-menu__cat-btn ${activeCategory === cat.key ? 'tab-menu__cat-btn--active' : ''}`}
              onClick={() => setActiveCategory(cat.key)}
              style={insertEdgeId && (cat.key === 'source' || cat.key === 'output') ? { opacity: 0.3, pointerEvents: 'none' } : {}}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="tab-menu__search-bar">
          <input
            ref={inputRef}
            type="text"
            className="tab-menu__search"
            placeholder="Search nodes... (Arrows to navigate, Enter to add)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="tab-menu__list" ref={listRef}>
          {results.length === 0 ? (
            <div className="tab-menu__empty">No matches found</div>
          ) : (
            results.map((fn, idx) => {
              const meta = categoryMeta[fn.category] || { color: '#ef4444' };
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={fn.name}
                  className={`tab-menu__item ${isSelected ? 'tab-menu__item--selected' : ''}`}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => handleSelect(fn)}
                  style={{ '--cat-color': meta.color } as React.CSSProperties}
                >
                  <span className="tab-menu__item-icon">
                    <CategoryIcon category={fn.category} size={16} />
                  </span>
                  <div className="tab-menu__item-info">
                    <div className="tab-menu__item-name">{fn.name}</div>
                    {fn.description && <div className="tab-menu__item-desc">{fn.description}</div>}
                  </div>
                  <span className="tab-menu__item-type">{fn.category}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
