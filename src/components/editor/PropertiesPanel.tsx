'use client';

import {
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Box,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Layers3,
  LayoutGrid,
  RectangleHorizontal,
  Rows3,
  Sparkles,
  Square,
  TextCursorInput,
  Type,
  Workflow,
} from 'lucide-react';
import { useEditorStore } from '@/hooks/use-editor-store';
import { useLayerDnd } from '@/hooks/use-layer-dnd';
import { GroupNode, NodeId, SceneDocument, SceneNode } from '@/lib/scene/types';
import { LayerContextMenu } from './LayerContextMenu';

function PanelHeader({
  title,
  meta,
  action,
}: {
  title: string;
  meta?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-foreground/42">
        {title}
      </div>
      <div className="flex items-center gap-2">
        {meta ? (
          <div className="text-[10px] uppercase tracking-[0.08em] text-foreground/35">
            {meta}
          </div>
        ) : null}
        {action}
      </div>
    </div>
  );
}

function Subsection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-border/60 px-3 py-3 first:border-t-0 first:pt-3">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-foreground/38">
        {title}
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

function FieldRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid grid-cols-[56px_minmax(0,1fr)] items-center gap-2 text-xs">
      <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-foreground/42">
        {label}
      </span>
      <div className="min-w-0">{children}</div>
    </label>
  );
}

function CommitTextInput({
  value,
  onCommit,
  multiline = false,
}: {
  value: string;
  onCommit: (next: string) => void;
  multiline?: boolean;
}) {
  const inputClassName = 'w-full rounded-md border border-border/70 bg-background px-2 py-1.5 text-xs font-mono text-foreground outline-none transition-colors focus:border-[#2563eb]/45 focus:ring-2 focus:ring-[#2563eb]/10';

  if (multiline) {
    return (
      <textarea
        key={value}
        defaultValue={value}
        rows={4}
        onBlur={(e) => {
          const next = e.currentTarget.value;
          if (next !== value) onCommit(next);
        }}
        className={inputClassName}
      />
    );
  }

  return (
    <input
      key={value}
      defaultValue={value}
      onBlur={(e) => {
        const next = e.currentTarget.value;
        if (next !== value) onCommit(next);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          (e.currentTarget as HTMLInputElement).blur();
        }
      }}
      className={inputClassName}
    />
  );
}

function CommitNumberInput({
  value,
  min,
  max,
  onCommit,
}: {
  value: number;
  min?: number;
  max?: number;
  onCommit: (next: number) => void;
}) {
  const commit = (raw: string, resetValue: (value: string) => void) => {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isNaN(parsed)) {
      resetValue(String(value));
      return;
    }
    let next = parsed;
    if (typeof min === 'number') next = Math.max(min, next);
    if (typeof max === 'number') next = Math.min(max, next);
    if (next !== value) onCommit(next);
    if (next !== parsed) resetValue(String(next));
  };

  return (
    <input
      type="number"
      key={String(value)}
      defaultValue={value}
      min={min}
      max={max}
      onBlur={(e) => commit(e.currentTarget.value, (v) => { e.currentTarget.value = v; })}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          (e.currentTarget as HTMLInputElement).blur();
        }
      }}
      className="w-full rounded-md border border-border/70 bg-background px-2 py-1.5 text-xs font-mono text-foreground outline-none transition-colors focus:border-[#2563eb]/45 focus:ring-2 focus:ring-[#2563eb]/10"
    />
  );
}

function BooleanToggle({ value, onChange }: { value: boolean; onChange: (next: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`w-full rounded-md border px-2 py-1.5 text-xs font-medium ${
        value
          ? 'border-[#2563eb]/35 bg-[#2563eb]/8 text-[#2563eb]'
          : 'border-border/70 bg-background text-foreground/65 hover:bg-foreground/[0.04]'
      }`}
    >
      {value ? 'Visible' : 'Hidden'}
    </button>
  );
}

function ActionButton({
  label,
  onClick,
  tone = 'default',
}: {
  label: string;
  onClick: () => void;
  tone?: 'default' | 'danger';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-7 rounded-md border px-2 text-[11px] font-medium ${
        tone === 'danger'
          ? 'border-red-500/20 text-red-500 hover:bg-red-500/6'
          : 'border-border/70 text-foreground/68 hover:bg-foreground/[0.04]'
      }`}
    >
      {label}
    </button>
  );
}

function EmptyHint({ children }: { children: ReactNode }) {
  return (
    <div className="px-3 py-3 text-xs leading-relaxed text-foreground/50">
      {children}
    </div>
  );
}

function toCsv(items: string[]): string {
  return items.join(', ');
}

function fromCsv(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

interface LayerRow {
  node: SceneNode;
  parentId: NodeId | null;
  indexInParent: number;
  depth: number;
  isGroup: boolean;
  collapsed: boolean;
}

function buildLayerRows(
  doc: SceneDocument,
  ids: NodeId[],
  collapsedGroupIds: Set<NodeId>,
  depth: number = 0,
  parentId: NodeId | null = null,
): LayerRow[] {
  const rows: LayerRow[] = [];
  const orderedIds = [...ids].reverse();

  for (let i = 0; i < orderedIds.length; i++) {
    const id = orderedIds[i];
    const node = doc.nodes.get(id);
    if (!node) continue;

    const isGroup = node.type === 'group';
    const collapsed = isGroup && collapsedGroupIds.has(node.id);
    const indexInParent = ids.length - 1 - i;

    rows.push({
      node,
      parentId,
      indexInParent,
      depth,
      isGroup,
      collapsed,
    });

    if (isGroup && !collapsed) {
      rows.push(...buildLayerRows(doc, (node as GroupNode).childIds, collapsedGroupIds, depth + 1, node.id));
    }
  }

  return rows;
}

function getNodeIcon(node: SceneNode) {
  switch (node.type) {
    case 'group':
      return <Layers3 className="h-3.5 w-3.5" />;
    case 'text':
      return <Type className="h-3.5 w-3.5" />;
    case 'button':
    case 'checkbox':
    case 'radio':
    case 'toggle':
    case 'dropdown':
      return <RectangleHorizontal className="h-3.5 w-3.5" />;
    case 'input':
    case 'search':
      return <TextCursorInput className="h-3.5 w-3.5" />;
    case 'table':
    case 'list':
    case 'pagination':
    case 'breadcrumb':
      return <Rows3 className="h-3.5 w-3.5" />;
    case 'card':
    case 'modal':
    case 'tabs':
    case 'nav':
    case 'placeholder':
    case 'hsplit':
      return <LayoutGrid className="h-3.5 w-3.5" />;
    case 'line':
    case 'arrow':
      return <Workflow className="h-3.5 w-3.5" />;
    case 'stroke':
      return <Sparkles className="h-3.5 w-3.5" />;
    case 'box':
      return <Box className="h-3.5 w-3.5" />;
    default:
      return <Square className="h-3.5 w-3.5" />;
  }
}

function hasNodeSpecificFields(node: SceneNode): boolean {
  switch (node.type) {
    case 'box':
    case 'hsplit':
      return false;
    default:
      return true;
  }
}

function NodeSpecificFields({
  node,
  onPatch,
  onDrill,
}: {
  node: SceneNode;
  onPatch: (patch: Partial<SceneNode>) => void;
  onDrill: (id: string) => void;
}) {
  switch (node.type) {
    case 'text':
      return (
        <FieldRow label="content">
          <CommitTextInput value={node.content} onCommit={(content) => onPatch({ content } as Partial<SceneNode>)} multiline />
        </FieldRow>
      );
    case 'button':
    case 'placeholder':
    case 'dropdown':
      return (
        <FieldRow label="label">
          <CommitTextInput value={node.label} onCommit={(label) => onPatch({ label } as Partial<SceneNode>)} />
        </FieldRow>
      );
    case 'checkbox':
      return (
        <>
          <FieldRow label="label">
            <CommitTextInput value={node.label} onCommit={(label) => onPatch({ label } as Partial<SceneNode>)} />
          </FieldRow>
          <FieldRow label="checked">
            <BooleanToggle value={node.checked} onChange={(checked) => onPatch({ checked } as Partial<SceneNode>)} />
          </FieldRow>
        </>
      );
    case 'radio':
      return (
        <>
          <FieldRow label="label">
            <CommitTextInput value={node.label} onCommit={(label) => onPatch({ label } as Partial<SceneNode>)} />
          </FieldRow>
          <FieldRow label="selected">
            <BooleanToggle value={node.selected} onChange={(selected) => onPatch({ selected } as Partial<SceneNode>)} />
          </FieldRow>
        </>
      );
    case 'toggle':
      return (
        <>
          <FieldRow label="label">
            <CommitTextInput value={node.label} onCommit={(label) => onPatch({ label } as Partial<SceneNode>)} />
          </FieldRow>
          <FieldRow label="state">
            <BooleanToggle value={node.on} onChange={(on) => onPatch({ on } as Partial<SceneNode>)} />
          </FieldRow>
        </>
      );
    case 'input':
    case 'search':
      return (
        <FieldRow label="hint">
          <CommitTextInput value={node.placeholder} onCommit={(placeholder) => onPatch({ placeholder } as Partial<SceneNode>)} />
        </FieldRow>
      );
    case 'card':
    case 'modal':
      return (
        <FieldRow label="title">
          <CommitTextInput value={node.title} onCommit={(title) => onPatch({ title } as Partial<SceneNode>)} />
        </FieldRow>
      );
    case 'progress':
      return (
        <FieldRow label="value">
          <CommitNumberInput value={node.value} min={0} max={100} onCommit={(value) => onPatch({ value } as Partial<SceneNode>)} />
        </FieldRow>
      );
    case 'list':
    case 'breadcrumb':
      return (
        <FieldRow label="items">
          <CommitTextInput value={toCsv(node.items)} onCommit={(raw) => onPatch({ items: fromCsv(raw) } as Partial<SceneNode>)} />
        </FieldRow>
      );
    case 'tabs':
      return (
        <>
          <FieldRow label="tabs">
            <CommitTextInput value={toCsv(node.tabs)} onCommit={(raw) => onPatch({ tabs: fromCsv(raw) } as Partial<SceneNode>)} />
          </FieldRow>
          <FieldRow label="active">
            <CommitNumberInput value={node.activeIndex} min={0} onCommit={(activeIndex) => onPatch({ activeIndex } as Partial<SceneNode>)} />
          </FieldRow>
        </>
      );
    case 'nav':
      return (
        <>
          <FieldRow label="logo">
            <CommitTextInput value={node.logo} onCommit={(logo) => onPatch({ logo } as Partial<SceneNode>)} />
          </FieldRow>
          <FieldRow label="links">
            <CommitTextInput value={toCsv(node.links)} onCommit={(raw) => onPatch({ links: fromCsv(raw) } as Partial<SceneNode>)} />
          </FieldRow>
          <FieldRow label="action">
            <CommitTextInput value={node.action} onCommit={(action) => onPatch({ action } as Partial<SceneNode>)} />
          </FieldRow>
        </>
      );
    case 'table':
      return (
        <>
          <FieldRow label="columns">
            <CommitTextInput value={toCsv(node.columns)} onCommit={(raw) => onPatch({ columns: fromCsv(raw) } as Partial<SceneNode>)} />
          </FieldRow>
          <FieldRow label="rows">
            <CommitNumberInput value={node.rowCount} min={1} onCommit={(rowCount) => onPatch({ rowCount } as Partial<SceneNode>)} />
          </FieldRow>
        </>
      );
    case 'pagination':
      return (
        <>
          <FieldRow label="current">
            <CommitNumberInput value={node.currentPage} min={1} onCommit={(currentPage) => onPatch({ currentPage } as Partial<SceneNode>)} />
          </FieldRow>
          <FieldRow label="total">
            <CommitNumberInput value={node.totalPages} min={1} onCommit={(totalPages) => onPatch({ totalPages } as Partial<SceneNode>)} />
          </FieldRow>
        </>
      );
    case 'group':
      return (
        <>
          <div className="text-xs text-foreground/50">
            {node.childIds.length} items inside
          </div>
          <ActionButton label="Edit inside group" onClick={() => onDrill(node.id)} />
        </>
      );
    case 'line':
    case 'arrow':
      return (
        <div className="text-xs text-foreground/50">
          {node.points.length} points
        </div>
      );
    case 'stroke':
      return (
        <div className="text-xs text-foreground/50">
          {node.cells.length} cells
        </div>
      );
    default:
      return null;
  }
}

function ToolSettingsPanel() {
  const activeTool = useEditorStore((s) => s.activeTool);
  const toolSettings = useEditorStore((s) => s.toolSettings);
  const updateToolSettings = useEditorStore((s) => s.updateToolSettings);

  if (activeTool === 'spray') {
    return (
      <Subsection title="Spray Defaults">
        <FieldRow label="radius">
          <CommitNumberInput
            value={toolSettings.spray.radius}
            min={1}
            max={12}
            onCommit={(radius) => updateToolSettings('spray', { radius })}
          />
        </FieldRow>
        <FieldRow label="density">
          <CommitNumberInput
            value={toolSettings.spray.density}
            min={1}
            max={30}
            onCommit={(density) => updateToolSettings('spray', { density })}
          />
        </FieldRow>
      </Subsection>
    );
  }

  if (activeTool === 'modal') {
    return (
      <Subsection title="Modal Defaults">
        <FieldRow label="title">
          <CommitTextInput
            value={toolSettings.modal.defaultTitle}
            onCommit={(defaultTitle) => updateToolSettings('modal', { defaultTitle })}
          />
        </FieldRow>
        <FieldRow label="width">
          <CommitNumberInput
            value={toolSettings.modal.defaultWidth}
            min={12}
            max={120}
            onCommit={(defaultWidth) => updateToolSettings('modal', { defaultWidth })}
          />
        </FieldRow>
        <FieldRow label="height">
          <CommitNumberInput
            value={toolSettings.modal.defaultHeight}
            min={6}
            max={80}
            onCommit={(defaultHeight) => updateToolSettings('modal', { defaultHeight })}
          />
        </FieldRow>
      </Subsection>
    );
  }

  return (
    <EmptyHint>
      Select a layer on the canvas or in the list to edit its properties.
    </EmptyHint>
  );
}

/** Shared inspector content used by both desktop sidebar and mobile sheet */
export function PropertiesPanelContent({ showLayers = true }: { showLayers?: boolean }) {
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const doc = useEditorStore((s) => s.document);
  const drillScope = useEditorStore((s) => s.drillScope);
  const setDrillScope = useEditorStore((s) => s.setDrillScope);
  const updateNode = useEditorStore((s) => s.updateNode);
  const moveNodes = useEditorStore((s) => s.moveNodes);
  const resizeNode = useEditorStore((s) => s.resizeNode);
  const setNodeVisibility = useEditorStore((s) => s.setNodeVisibility);
  const setSelection = useEditorStore((s) => s.setSelection);
  const removeNodes = useEditorStore((s) => s.removeNodes);
  const groupSelected = useEditorStore((s) => s.groupSelected);
  const ungroupSelected = useEditorStore((s) => s.ungroupSelected);
  const bringToFront = useEditorStore((s) => s.bringToFront);
  const sendToBack = useEditorStore((s) => s.sendToBack);
  const renameNode = useEditorStore((s) => s.renameNode);
  const reparentLayers = useEditorStore((s) => s.reparentLayers);
  const pushUndo = useEditorStore((s) => s.pushUndo);

  const [collapsedGroupIds, setCollapsedGroupIds] = useState<Set<NodeId>>(new Set());
  const [renamingId, setRenamingId] = useState<NodeId | null>(null);
  const suppressLayerClickRef = useRef(false);

  const selectedNode = selectedIds.length === 1 ? doc.nodes.get(selectedIds[0]) ?? null : null;
  const drillNode = drillScope ? doc.nodes.get(drillScope) : null;
  const layerRootIds = drillNode && drillNode.type === 'group' ? drillNode.childIds : doc.rootOrder;
  const layerRows = useMemo(
    () => buildLayerRows(doc, layerRootIds, collapsedGroupIds),
    [doc, layerRootIds, collapsedGroupIds],
  );

  const {
    registerRowRef,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    dropTarget,
  } = useLayerDnd(layerRows, selectedIds, doc);

  const commitPatch = (node: SceneNode, patch: Partial<SceneNode>) => {
    pushUndo();
    updateNode(node.id, patch);
  };

  const commitX = (node: SceneNode, x: number) => {
    const dCol = x - node.bounds.x;
    if (dCol === 0) return;
    pushUndo();
    moveNodes([node.id], 0, dCol);
  };

  const commitY = (node: SceneNode, y: number) => {
    const dRow = y - node.bounds.y;
    if (dRow === 0) return;
    pushUndo();
    moveNodes([node.id], dRow, 0);
  };

  const commitWidth = (node: SceneNode, width: number) => {
    if (width === node.bounds.width) return;
    pushUndo();
    resizeNode(node.id, { ...node.bounds, width });
  };

  const commitHeight = (node: SceneNode, height: number) => {
    if (height === node.bounds.height) return;
    pushUndo();
    resizeNode(node.id, { ...node.bounds, height });
  };

  const toggleGroupCollapse = (id: NodeId) => {
    setCollapsedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const deleteIds = (ids: NodeId[]) => {
    if (ids.length === 0) return;
    pushUndo();
    removeNodes(ids);
    if (renamingId && ids.includes(renamingId)) setRenamingId(null);
  };

  const runOnSelection = (nodeId: NodeId, action: () => void) => {
    const ids = selectedIds.includes(nodeId) ? selectedIds : [nodeId];
    setSelection(ids);
    action();
  };

  const handleLayerRenameStart = (id: NodeId) => {
    setSelection([id]);
    setRenamingId(id);
  };

  const handleLayerRenameCommit = (id: NodeId, next: string, fallback: string) => {
    const trimmed = next.trim();
    setRenamingId(null);
    if (!trimmed || trimmed === fallback) return;
    renameNode(id, trimmed);
  };

  const handleLayerClick = (event: ReactMouseEvent<HTMLDivElement>, nodeId: NodeId) => {
    if (suppressLayerClickRef.current) {
      suppressLayerClickRef.current = false;
      return;
    }

    setRenamingId(null);

    if (event.metaKey || event.ctrlKey) {
      if (selectedIds.includes(nodeId)) {
        setSelection(selectedIds.filter((id) => id !== nodeId));
      } else {
        setSelection([...selectedIds, nodeId]);
      }
      return;
    }

    setSelection([nodeId]);
  };

  const handleLayerDoubleClick = (node: SceneNode) => {
    if (node.type !== 'group') return;
    setDrillScope(node.id);
  };

  const handleLayerPointerDown = (nodeId: NodeId, event: ReactPointerEvent<HTMLDivElement>) => {
    if (renamingId === nodeId) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    onPointerDown(nodeId, event);
  };

  const handleLayerPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const result = onPointerUp();
    if (!result) return;

    suppressLayerClickRef.current = true;

    if (result.dropTarget.kind === 'into-group') {
      const group = doc.nodes.get(result.dropTarget.groupId);
      const index = group?.type === 'group' ? group.childIds.length : 0;
      reparentLayers(result.dragIds, result.dropTarget.groupId, index);
      setSelection(result.dragIds);
      return;
    }

    reparentLayers(result.dragIds, result.dropTarget.parentId, result.dropTarget.index);
    setSelection(result.dragIds);
  };

  const layersPane = showLayers ? (
    <div className="flex min-h-[220px] max-h-[44%] flex-col border-b border-border/60">
      <PanelHeader
        title="Layers"
        meta={String(layerRows.length)}
        action={drillNode && drillNode.type === 'group' ? (
          <button
            type="button"
            onClick={() => setDrillScope(null)}
            className="text-[10px] font-medium text-foreground/55 hover:text-foreground/80"
          >
            Exit
          </button>
        ) : undefined}
      />

      {drillNode && drillNode.type === 'group' ? (
        <div className="border-b border-border/60 px-3 py-2 text-[11px] text-foreground/50">
          Inside {drillNode.name}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-1.5">
        {layerRows.length === 0 ? (
          <EmptyHint>
            {drillScope
              ? 'This group is empty.'
              : 'Draw or insert something and it will appear here.'}
          </EmptyHint>
        ) : null}

        {layerRows.map((row) => {
          const node = row.node;
          const selected = selectedIds.includes(node.id);
          const renameActive = renamingId === node.id;
          const groupChildCount = node.type === 'group' ? node.childIds.length : 0;
          const showDropAbove = dropTarget?.kind === 'between'
            && dropTarget.parentId === row.parentId
            && dropTarget.index === row.indexInParent + 1;
          const showDropBelow = (dropTarget?.kind === 'between'
            && dropTarget.parentId === row.parentId
            && dropTarget.index === row.indexInParent)
            || (dropTarget?.kind === 'between'
              && row.isGroup
              && dropTarget.parentId === node.id
              && dropTarget.index === groupChildCount);
          const showDropIntoGroup = dropTarget?.kind === 'into-group' && dropTarget.groupId === node.id;

          return (
            <LayerContextMenu
              key={node.id}
              nodeId={node.id}
              isGroup={row.isGroup}
              selectedIds={selectedIds}
              onRename={handleLayerRenameStart}
              onGroup={() => runOnSelection(node.id, groupSelected)}
              onUngroup={() => runOnSelection(node.id, ungroupSelected)}
              onBringToFront={() => runOnSelection(node.id, bringToFront)}
              onSendToBack={() => runOnSelection(node.id, sendToBack)}
              onDelete={(ids) => deleteIds(ids)}
            >
              <div
                ref={(el) => registerRowRef(node.id, el)}
                onClick={(event) => handleLayerClick(event, node.id)}
                onDoubleClick={() => handleLayerDoubleClick(node)}
                onPointerDown={(event) => handleLayerPointerDown(node.id, event)}
                onPointerMove={onPointerMove}
                onPointerUp={handleLayerPointerUp}
                className={`group relative flex h-7 items-center gap-1.5 rounded-md pr-1 text-xs ${
                  selected
                    ? 'bg-[#2563eb]/10 text-foreground'
                    : 'text-foreground/72 hover:bg-foreground/[0.04]'
                } ${!node.visible ? 'opacity-60' : ''} ${showDropIntoGroup ? 'bg-[#2563eb]/8' : ''}`}
                style={{ paddingLeft: `${8 + row.depth * 12}px` }}
              >
                {showDropAbove ? (
                  <div className="absolute left-1 right-1 top-0 h-px bg-[#2563eb]" />
                ) : null}
                {showDropBelow ? (
                  <div className="absolute left-1 right-1 bottom-0 h-px bg-[#2563eb]" />
                ) : null}

                {row.isGroup ? (
                  <button
                    type="button"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleGroupCollapse(node.id);
                    }}
                    className="flex h-4 w-4 items-center justify-center text-foreground/40 hover:text-foreground/80"
                    aria-label={row.collapsed ? 'Expand group' : 'Collapse group'}
                  >
                    {row.collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                ) : (
                  <span className="w-4 shrink-0" />
                )}

                <span className="shrink-0 text-foreground/45">
                  {getNodeIcon(node)}
                </span>

                {renameActive ? (
                  <input
                    autoFocus
                    defaultValue={node.name}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => event.stopPropagation()}
                    onBlur={(event) => handleLayerRenameCommit(node.id, event.currentTarget.value, node.name)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        (event.currentTarget as HTMLInputElement).blur();
                      }
                      if (event.key === 'Escape') {
                        setRenamingId(null);
                      }
                    }}
                    className="min-w-0 flex-1 rounded-md border border-[#2563eb]/35 bg-background px-2 py-1 text-xs font-medium text-foreground outline-none"
                  />
                ) : (
                  <span className="min-w-0 flex-1 truncate">{node.name}</span>
                )}

                <button
                  type="button"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    pushUndo();
                    setNodeVisibility(node.id, !node.visible);
                  }}
                  className="flex h-5 w-5 shrink-0 items-center justify-center text-foreground/35 hover:text-foreground/75"
                  aria-label={node.visible ? 'Hide layer' : 'Show layer'}
                >
                  {node.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                </button>
              </div>
            </LayerContextMenu>
          );
        })}
      </div>
    </div>
  ) : null;

  const inspectMeta = selectedIds.length > 1
    ? `${selectedIds.length} selected`
    : selectedNode?.type;

  const inspectPane = (
    <div className="flex min-h-0 flex-1 flex-col">
      <PanelHeader title="Inspect" meta={inspectMeta} />

      <div className="min-h-0 flex-1 overflow-y-auto">
        {selectedIds.length === 0 ? (
          <ToolSettingsPanel />
        ) : null}

        {selectedIds.length > 1 ? (
          <Subsection title="Selection">
            <div className="text-xs text-foreground/55">
              {selectedIds.length} objects selected.
            </div>
            <div className="text-[11px] text-foreground/42">
              Use the layer list, context menu, or shortcuts to group, hide, or delete them.
            </div>
          </Subsection>
        ) : null}

        {selectedNode ? (
          <>
            <Subsection title="Selection">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-foreground/88">
                  {selectedNode.name}
                </div>
                <div className="mt-0.5 text-[11px] text-foreground/45">
                  {selectedNode.type}
                </div>
              </div>
            </Subsection>

            <Subsection title="Properties">
              <FieldRow label="name">
                <CommitTextInput
                  value={selectedNode.name}
                  onCommit={(name) => commitPatch(selectedNode, { name })}
                />
              </FieldRow>
            </Subsection>

            <Subsection title="Frame">
              <FieldRow label="x">
                <CommitNumberInput
                  value={selectedNode.bounds.x}
                  min={0}
                  onCommit={(x) => commitX(selectedNode, x)}
                />
              </FieldRow>
              <FieldRow label="y">
                <CommitNumberInput
                  value={selectedNode.bounds.y}
                  min={0}
                  onCommit={(y) => commitY(selectedNode, y)}
                />
              </FieldRow>
              <FieldRow label="width">
                <CommitNumberInput
                  value={selectedNode.bounds.width}
                  min={1}
                  onCommit={(width) => commitWidth(selectedNode, width)}
                />
              </FieldRow>
              <FieldRow label="height">
                <CommitNumberInput
                  value={selectedNode.bounds.height}
                  min={1}
                  onCommit={(height) => commitHeight(selectedNode, height)}
                />
              </FieldRow>
            </Subsection>

            {hasNodeSpecificFields(selectedNode) ? (
              <Subsection title="Content">
                <NodeSpecificFields
                  node={selectedNode}
                  onPatch={(patch) => commitPatch(selectedNode, patch)}
                  onDrill={(id) => setDrillScope(id)}
                />
              </Subsection>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );

  if (!showLayers) {
    return inspectPane;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {layersPane}
      {inspectPane}
    </div>
  );
}

export function PropertiesPanel() {
  const selectedIds = useEditorStore((s) => s.selectedIds);

  return (
    <aside className="hidden md:flex h-full w-[280px] min-w-[280px] flex-col border-l border-border/60 bg-background">
      <div className="border-b border-border/60 px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[11px] font-semibold text-foreground/78">
            Layers & Inspect
          </div>
          <div className="text-[10px] uppercase tracking-[0.08em] text-foreground/35">
            {selectedIds.length > 0 ? `${selectedIds.length} selected` : 'Ready'}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <PropertiesPanelContent />
      </div>
    </aside>
  );
}
