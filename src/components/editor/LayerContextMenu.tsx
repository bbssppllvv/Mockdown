'use client';

import { type ReactNode } from 'react';
import { ContextMenu } from 'radix-ui';
import { NodeId } from '@/lib/scene/types';

interface LayerContextMenuProps {
  children: ReactNode;
  nodeId: NodeId;
  isGroup: boolean;
  selectedIds: NodeId[];
  onRename: (id: NodeId) => void;
  onGroup: () => void;
  onUngroup: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onDelete: (ids: NodeId[]) => void;
}

const itemClass =
  'flex items-center justify-between px-2 py-1 text-xs font-mono outline-none cursor-default select-none rounded-sm data-[highlighted]:bg-foreground/10';

export function LayerContextMenu({
  children,
  nodeId,
  isGroup,
  selectedIds,
  onRename,
  onGroup,
  onUngroup,
  onBringToFront,
  onSendToBack,
  onDelete,
}: LayerContextMenuProps) {
  const ids = selectedIds.includes(nodeId) ? selectedIds : [nodeId];

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content
          className="min-w-[160px] rounded-md border border-border/60 bg-background p-1 shadow-md font-mono text-xs z-50"
          alignOffset={5}
        >
          <ContextMenu.Item className={itemClass} onSelect={() => onRename(nodeId)}>
            Rename
          </ContextMenu.Item>

          <ContextMenu.Separator className="my-1 h-px bg-border/40" />

          {ids.length >= 2 && (
            <ContextMenu.Item className={itemClass} onSelect={onGroup}>
              <span>Group</span>
              <span className="text-foreground/30 ml-4">&#8984;G</span>
            </ContextMenu.Item>
          )}

          {isGroup && ids.length === 1 && (
            <ContextMenu.Item className={itemClass} onSelect={onUngroup}>
              <span>Ungroup</span>
              <span className="text-foreground/30 ml-4">&#8984;&#8679;G</span>
            </ContextMenu.Item>
          )}

          <ContextMenu.Item className={itemClass} onSelect={onBringToFront}>
            <span>Bring to Front</span>
            <span className="text-foreground/30 ml-4">&#8984;]</span>
          </ContextMenu.Item>

          <ContextMenu.Item className={itemClass} onSelect={onSendToBack}>
            <span>Send to Back</span>
            <span className="text-foreground/30 ml-4">&#8984;[</span>
          </ContextMenu.Item>

          <ContextMenu.Separator className="my-1 h-px bg-border/40" />

          <ContextMenu.Item
            className={`${itemClass} text-red-500 data-[highlighted]:text-red-600`}
            onSelect={() => onDelete(ids)}
          >
            <span>Delete</span>
            <span className="text-red-400/50 ml-4">Del</span>
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
