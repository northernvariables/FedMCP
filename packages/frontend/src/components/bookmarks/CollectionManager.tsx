/**
 * CollectionManager Component
 *
 * Tier-aware collection management for organizing bookmarks
 * Available for BASIC+ tiers only
 */

'use client';

import { useState } from 'react';
import { Folder, Plus, X, Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface Collection {
  id: string;
  name: string;
  description?: string;
  bookmark_count: number;
}

interface CollectionManagerProps {
  collections?: Collection[];
  selectedCollectionId?: string | null;
  onSelectCollection?: (collectionId: string | null) => void;
  onCreateCollection?: (name: string, description?: string) => Promise<void>;
  onDeleteCollection?: (collectionId: string) => Promise<void>;
}

export function CollectionManager({
  collections = [],
  selectedCollectionId,
  onSelectCollection,
  onCreateCollection,
  onDeleteCollection,
}: CollectionManagerProps) {
  const { profile } = useAuth();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDesc, setNewCollectionDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const tier = profile?.subscription_tier || 'FREE';
  const canUseCollections = tier === 'BASIC' || tier === 'PRO';

  const handleCreate = async () => {
    if (!newCollectionName.trim() || !onCreateCollection) return;

    setCreating(true);
    try {
      await onCreateCollection(newCollectionName.trim(), newCollectionDesc.trim() || undefined);
      setNewCollectionName('');
      setNewCollectionDesc('');
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create collection:', error);
      alert('Failed to create collection');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (collectionId: string) => {
    if (!onDeleteCollection) return;
    if (!confirm('Delete this collection? Bookmarks will not be deleted.')) return;

    try {
      await onDeleteCollection(collectionId);
    } catch (error) {
      console.error('Failed to delete collection:', error);
      alert('Failed to delete collection');
    }
  };

  // Free tier - show upgrade prompt
  if (!canUseCollections) {
    return (
      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
              Collections (BASIC+)
            </h4>
            <p className="text-sm text-amber-800 dark:text-amber-200 mb-2">
              Organize your bookmarks into folders with BASIC or PRO tier.
            </p>
            <a
              href="/pricing"
              className="text-sm text-accent-red hover:text-red-700 dark:hover:text-red-400 font-medium"
            >
              Upgrade to unlock →
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <Folder size={16} />
          Collections
        </h3>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="p-1 rounded hover:bg-bg-overlay text-text-tertiary hover:text-accent-red transition-colors"
          title="Create collection"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="p-3 bg-bg-elevated border border-border-subtle rounded-lg space-y-2">
          <input
            type="text"
            value={newCollectionName}
            onChange={(e) => setNewCollectionName(e.target.value)}
            placeholder="Collection name"
            maxLength={50}
            className="w-full px-3 py-2 rounded bg-bg-primary border border-border text-sm text-text-primary focus:border-accent-red focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
              if (e.key === 'Escape') setShowCreateForm(false);
            }}
          />
          <textarea
            value={newCollectionDesc}
            onChange={(e) => setNewCollectionDesc(e.target.value)}
            placeholder="Description (optional)"
            maxLength={200}
            rows={2}
            className="w-full px-3 py-2 rounded bg-bg-primary border border-border text-sm text-text-primary focus:border-accent-red focus:outline-none resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={!newCollectionName.trim() || creating}
              className="flex-1 px-3 py-1.5 bg-accent-red text-white text-sm font-medium rounded hover:bg-accent-red-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
            <button
              onClick={() => {
                setShowCreateForm(false);
                setNewCollectionName('');
                setNewCollectionDesc('');
              }}
              className="px-3 py-1.5 bg-bg-overlay text-text-secondary text-sm font-medium rounded hover:bg-bg-elevated"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Collections List */}
      {collections.length > 0 ? (
        <div className="space-y-1">
          {/* All Bookmarks (default) */}
          <button
            onClick={() => onSelectCollection?.(null)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
              selectedCollectionId === null
                ? 'bg-accent-red/10 text-accent-red font-medium'
                : 'text-text-secondary hover:bg-bg-overlay hover:text-text-primary'
            }`}
          >
            <span className="flex items-center gap-2">
              <Folder size={14} />
              All Bookmarks
            </span>
          </button>

          {/* User Collections */}
          {collections.map((collection) => (
            <div
              key={collection.id}
              className={`group flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                selectedCollectionId === collection.id
                  ? 'bg-accent-red/10 text-accent-red font-medium'
                  : 'text-text-secondary hover:bg-bg-overlay hover:text-text-primary'
              }`}
            >
              <button
                onClick={() => onSelectCollection?.(collection.id)}
                className="flex-1 flex items-center gap-2 text-left"
              >
                <Folder size={14} />
                <span className="truncate">{collection.name}</span>
                <span className="text-xs opacity-60">({collection.bookmark_count})</span>
              </button>
              <button
                onClick={() => handleDelete(collection.id)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 transition-opacity"
                title="Delete collection"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-text-tertiary italic text-center py-4">
          No collections yet
        </div>
      )}
    </div>
  );
}
