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
  ArrowDownToLine,
  ArrowUpToLine,
  Box,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  GripVertical,
  Layers3,
  LayoutGrid,
  ListTree,
  MousePointer2,
  PenSquare,
  RectangleHorizontal,
  Rows3,
  Sparkles,
  Square,
  TextCursorInput,
  Trash2,
  Type,
  Workflow,
} from 'lucide-react';
import { useEditorStore } from '@/hooks/use-editor-store';
import { useLayerDnd } from '@/hooks/use-layer-dnd';
import { GroupNode, NodeId, SceneDocument, SceneNode } from '@/lib/scene/types';
import { LayerContextMenu } from './LayerContextMenu';

type PanelTab = 'layers' | 'inspect';

function Section({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border/70 bg-foreground/[0.03] p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground/35">
          {title}
        </div>
        {badge ? (
          <div className="rounded-full border border-border/70 bg-background px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-foreground/45">
            {badge}
          </div>
        ) : null}
      </div>
      <div className="flex flex-col gap-2.5">{children}</div>
    </section>
  );
}

function FieldRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid grid-cols-[68px_minmax(0,1fr)] items-center gap-2 text-xs">
      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-foreground/42">
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
  const inputClassName = 'w-full rounded-lg border border-border/80 bg-background px-2.5 py-2 text-xs font-mono text-foreground shadow-sm outline-none transition-colors focus:border-[#2563eb]/55 focus:ring-2 focus:ring-[#2563eb]/12';

  if (multiline) {
    return (
      <textarea
        key={value}
        defaultValue={value}
        onBlur={(e) => {
          const next = e.currentTarget.value;
          if (next !== value) onCommit(next);
        }}
        rows={4}
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
      className="w-full rounded-lg border border-border/80 bg-background px-2.5 py-2 text-xs font-mono text-foreground shadow-sm outline-none transition-colors focus:border-[#2563eb]/55 focus:ring-2 focus:ring-[#2563eb]/12"
    />
  );
}

function BooleanToggle({ value, onChange }: { value: boolean; onChange: (next: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`w-full rounded-lg border px-2.5 py-2 text-xs font-semibold uppercase tracking-[0.08em] ${
        value
          ? 'border-[#2563eb]/40 bg-[#2563eb]/10 text-[#2563eb]'
          : 'border-border/80 bg-background text-foreground/60 hover:bg-foreground/5'
      }`}
    >
      {value ? 'On' : 'Off'}
    </button>
  );
}

function QuickActionButton({
  label,
  icon,
  onClick,
  tone = 'default',
  disabled = false,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  tone?: 'default' | 'accent' | 'danger';
  disabled?: boolean;
}) {
  const toneClassName = tone === 'accent'
    ? 'border-[#2563eb]/20 bg-[#2563eb]/8 text-[#2563eb] hover:bg-[#2563eb]/12'
    : tone === 'danger'
      ? 'border-red-500/20 bg-red-500/6 text-red-500 hover:bg-red-500/10'
      : 'border-border/80 bg-background text-foreground/68 hover:bg-foreground/5';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors disabled:pointer-events-none disabled:opacity-35 ${toneClassName}`}
    >
      <span className="shrink-0">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function EmptyPanel({
  icon,
  title,
  body,
  children,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border/80 bg-background/70 p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-lg border border-border/70 bg-foreground/[0.04] p-2 text-foreground/55">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold tracking-[-0.01em] text-foreground/88">{title}</div>
          <div className="mt-1 text-xs leading-relaxed text-foreground/55">{body}</div>
          {children ? <div className="mt-3">{children}</div> : null}
        </div>
      </div>
    </div>
  );
}

function TinyStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-background px-2.5 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-foreground/38">{label}</div>
      <div className="mt-1 text-xs font-semibold text-foreground/82">{value}</div>
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
      return node.visible ? <Layers3 className="h-3.5 w-3.5" /> : <ListTree className="h-3.5 w-3.5" />;
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

function getNodeMeta(node: SceneNode): string {
  switch (node.type) {
    case 'group':
      return `${node.childIds.length} items`;
    case 'text':
      return `${node.content.split('\n').length} line${node.content.includes('\n') ? 's' : ''}`;
    case 'button':
    case 'dropdown':
    case 'placeholder':
      return node.label;
    case 'checkbox':
      return node.checked ? 'Checked' : 'Unchecked';
    case 'radio':
      return node.selected ? 'Selected' : 'Idle';
    case 'toggle':
      return node.on ? 'On' : 'Off';
    case 'input':
    case 'search':
      return node.placeholder || 'Placeholder';
    case 'card':
    case 'modal':
      return node.title;
    case 'progress':
      return `${node.value}%`;
    case 'list':
    case 'breadcrumb':
      return `${node.items.length} items`;
    case 'tabs':
      return `${node.tabs.length} tabs`;
    case 'nav':
      return `${node.links.length} links`;
    case 'table':
      return `${node.columns.length} cols · ${node.rowCount} rows`;
    case 'pagination':
      return `Page ${node.currentPage}/${node.totalPages}`;
    case 'line':
    case 'arrow':
      return `${node.points.length} pts`;
    case 'stroke':
      return `${node.cells.length} cells`;
    default:
      return `${node.bounds.width}×${node.bounds.height}`;
  }
}

function getBoundsLabel(node: SceneNode): string {
  return `${node.bounds.width}×${node.bounds.height}`;
}

function getSelectionBounds(nodes: SceneNode[]): string {
  if (nodes.length === 0) return '0×0';

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    minX = Math.min(minX, node.bounds.x);
    minY = Math.min(minY, node.bounds.y);
    maxX = Math.max(maxX, node.bounds.x + node.bounds.width);
    maxY = Math.max(maxY, node.bounds.y + node.bounds.height);
  }

  return `${Math.max(1, maxX - minX)}×${Math.max(1, maxY - minY)}`;
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
        <FieldRow label="placeholder">
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
          <div className="rounded-lg border border-border/70 bg-background px-2.5 py-2 text-xs text-foreground/58">
            {node.childIds.length} child objects
          </div>
          <button
            onClick={() => onDrill(node.id)}
            className="w-full rounded-lg border border-border/80 bg-background px-2.5 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-foreground/68 hover:bg-foreground/5"
          >
            Edit Inside Group
          </button>
        </>
      );
    case 'line':
    case 'arrow':
      return (
        <div className="rounded-lg border border-border/70 bg-background px-2.5 py-2 text-xs text-foreground/58">
          {node.points.length} points
        </div>
      );
    case 'stroke':
      return (
        <div className="rounded-lg border border-border/70 bg-background px-2.5 py-2 text-xs text-foreground/58">
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
      <Section title="Spray Settings" badge="Tool">
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
      </Section>
    );
  }

  if (activeTool === 'modal') {
    return (
      <Section title="Modal Defaults" badge="Tool">
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
      </Section>
    );
  }

  return (
    <EmptyPanel
      icon={<MousePointer2 className="h-4 w-4" />}
      title="Select an object to inspect"
      body="When nothing is selected this panel stays calm and only shows tool defaults for tools that need them."
    />
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

  const [activeTab, setActiveTab] = useState<PanelTab>(showLayers ? 'layers' : 'inspect');
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<Set<NodeId>>(new Set());
  const [renamingId, setRenamingId] = useState<NodeId | null>(null);
  const suppressLayerClickRef = useRef(false);

  const selectedNodes = useMemo(
    () => selectedIds
      .map((id) => doc.nodes.get(id))
      .filter((node): node is SceneNode => Boolean(node)),
    [doc, selectedIds],
  );
  const singleId = selectedIds.length === 1 ? selectedIds[0] : null;
  const selectedNode = singleId ? doc.nodes.get(singleId) ?? null : null;
  const drillNode = drillScope ? doc.nodes.get(drillScope) : null;
  const layerRootIds = drillNode && drillNode.type === 'group' ? drillNode.childIds : doc.rootOrder;
  const layerRows = useMemo(
    () => buildLayerRows(doc, layerRootIds, collapsedGroupIds),
    [doc, layerRootIds, collapsedGroupIds],
  );
  const selectionBounds = useMemo(() => getSelectionBounds(selectedNodes), [selectedNodes]);
  const allSelectedVisible = selectedNodes.length > 0 && selectedNodes.every((node) => node.visible);
  const canGroup = selectedIds.length >= 2;
  const canUngroup = selectedNode?.type === 'group';
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

  const toggleSelectedVisibility = () => {
    if (selectedNodes.length === 0) return;
    pushUndo();
    for (const node of selectedNodes) {
      setNodeVisibility(node.id, !allSelectedVisible);
    }
  };

  const runOnSelection = (nodeId: NodeId, action: () => void) => {
    const ids = selectedIds.includes(nodeId) ? selectedIds : [nodeId];
    setSelection(ids);
    action();
  };

  const handleLayerRenameStart = (id: NodeId) => {
    setActiveTab('layers');
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

  const renderSelectionActions = () => (
    <div className="flex flex-wrap gap-2">
      {canGroup ? (
        <QuickActionButton
          label="Group"
          icon={<Layers3 className="h-3.5 w-3.5" />}
          onClick={groupSelected}
          tone="accent"
        />
      ) : null}
      {canUngroup ? (
        <QuickActionButton
          label="Ungroup"
          icon={<ListTree className="h-3.5 w-3.5" />}
          onClick={ungroupSelected}
        />
      ) : null}
      {selectedNodes.length > 0 ? (
        <>
          <QuickActionButton
            label={allSelectedVisible ? 'Hide' : 'Show'}
            icon={allSelectedVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            onClick={toggleSelectedVisibility}
          />
          <QuickActionButton
            label="Front"
            icon={<ArrowUpToLine className="h-3.5 w-3.5" />}
            onClick={bringToFront}
          />
          <QuickActionButton
            label="Back"
            icon={<ArrowDownToLine className="h-3.5 w-3.5" />}
            onClick={sendToBack}
          />
          <QuickActionButton
            label="Delete"
            icon={<Trash2 className="h-3.5 w-3.5" />}
            onClick={() => deleteIds(selectedIds)}
            tone="danger"
          />
        </>
      ) : null}
    </div>
  );

  const renderLayersTab = () => (
    <div className="flex flex-col gap-4">
      {drillNode && drillNode.type === 'group' ? (
        <Section title="Scope" badge="Inside Group">
          <div className="rounded-lg border border-border/70 bg-background px-3 py-3">
            <div className="text-sm font-semibold tracking-[-0.01em] text-foreground/86">{drillNode.name}</div>
            <div className="mt-1 text-xs text-foreground/55">
              Editing the group contents directly. Double-click another group to drill deeper.
            </div>
            <div className="mt-3">
              <QuickActionButton
                label="Exit Group"
                icon={<ChevronRight className="h-3.5 w-3.5 rotate-180" />}
                onClick={() => setDrillScope(null)}
              />
            </div>
          </div>
        </Section>
      ) : null}

      {selectedNodes.length > 0 ? (
        <Section title="Selection Focus" badge={selectedNodes.length > 1 ? `${selectedNodes.length} items` : selectedNode?.type}>
          <div className="rounded-lg border border-border/70 bg-background px-3 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold tracking-[-0.01em] text-foreground/88">
                  {selectedNodes.length > 1 ? `${selectedNodes.length} objects selected` : selectedNode?.name}
                </div>
                <div className="mt-1 text-xs text-foreground/55">
                  {selectedNodes.length > 1
                    ? `Combined frame ${selectionBounds}. Use cmd-click in layers to refine the set.`
                    : `${getNodeMeta(selectedNode!)} · ${getBoundsLabel(selectedNode!)}`}
                </div>
              </div>
              {showLayers ? (
                <QuickActionButton
                  label="Inspect"
                  icon={<PenSquare className="h-3.5 w-3.5" />}
                  onClick={() => setActiveTab('inspect')}
                  tone="accent"
                />
              ) : null}
            </div>
            <div className="mt-3">{renderSelectionActions()}</div>
          </div>
        </Section>
      ) : null}

      <Section title={drillScope ? 'Layers In Scope' : 'Layers'} badge={`${layerRows.length}`}>
        <div className="mb-3 rounded-lg border border-border/70 bg-background px-3 py-2 text-[11px] leading-relaxed text-foreground/52">
          Drag layers to reorder, double-click groups to enter, right-click for quick actions.
        </div>

        <div className="flex flex-col gap-1">
          {layerRows.length === 0 ? (
            <EmptyPanel
              icon={<Layers3 className="h-4 w-4" />}
              title="No objects here yet"
              body={drillScope ? 'This group is empty. Exit the group or add something to it from the canvas.' : 'Draw or insert something on the canvas and it will appear here.'}
            />
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
                  className={`group relative rounded-xl border transition-colors ${
                    selected
                      ? 'border-[#2563eb]/30 bg-[#2563eb]/8 shadow-sm'
                      : 'border-transparent bg-background/80 hover:border-border/70 hover:bg-background'
                  } ${showDropIntoGroup ? 'border-[#2563eb]/45 ring-2 ring-[#2563eb]/15' : ''}`}
                  style={{ paddingLeft: `${10 + row.depth * 14}px` }}
                >
                  {showDropAbove ? (
                    <div className="absolute left-2 right-2 top-0 h-0.5 rounded-full bg-[#2563eb]" />
                  ) : null}
                  {showDropBelow ? (
                    <div className="absolute left-2 right-2 bottom-0 h-0.5 rounded-full bg-[#2563eb]" />
                  ) : null}

                  <div className="flex items-start gap-2 px-2.5 py-2.5">
                    <div className="mt-0.5 flex w-7 shrink-0 items-center gap-1 text-foreground/28">
                      <GripVertical className="h-3.5 w-3.5" />
                      {row.isGroup ? (
                        <button
                          type="button"
                          onPointerDown={(event) => event.stopPropagation()}
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleGroupCollapse(node.id);
                          }}
                          className="rounded-md p-0.5 text-foreground/40 hover:bg-foreground/6 hover:text-foreground/80"
                          aria-label={row.collapsed ? 'Expand group' : 'Collapse group'}
                        >
                          {row.collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>
                      ) : (
                        <span className="w-4" />
                      )}
                    </div>

                    <div className="mt-0.5 shrink-0 rounded-lg border border-border/70 bg-foreground/[0.04] p-1.5 text-foreground/55">
                      {getNodeIcon(node)}
                    </div>

                    <div className="min-w-0 flex-1">
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
                          className="w-full rounded-lg border border-[#2563eb]/35 bg-background px-2 py-1.5 text-xs font-semibold text-foreground outline-none ring-2 ring-[#2563eb]/12"
                        />
                      ) : (
                        <>
                          <div className="truncate text-xs font-semibold tracking-[0.01em] text-foreground/88">
                            {node.name}
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.08em] text-foreground/42">
                            <span>{node.type}</span>
                            <span>{getNodeMeta(node)}</span>
                            {!node.visible ? <span className="text-red-500/70">hidden</span> : null}
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                      {row.isGroup ? (
                        <button
                          type="button"
                          onPointerDown={(event) => event.stopPropagation()}
                          onClick={(event) => {
                            event.stopPropagation();
                            setDrillScope(node.id);
                          }}
                          className="rounded-lg border border-border/70 bg-background p-1.5 text-foreground/55 hover:bg-foreground/5 hover:text-foreground/85"
                          aria-label="Enter group"
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={(event) => {
                          event.stopPropagation();
                          pushUndo();
                          setNodeVisibility(node.id, !node.visible);
                        }}
                        className="rounded-lg border border-border/70 bg-background p-1.5 text-foreground/55 hover:bg-foreground/5 hover:text-foreground/85"
                        aria-label={node.visible ? 'Hide object' : 'Show object'}
                      >
                        {node.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </LayerContextMenu>
            );
          })}
        </div>
      </Section>
    </div>
  );

  const renderInspectTab = () => {
    if (selectedIds.length === 0) {
      return (
        <div className="flex flex-col gap-4">
          <ToolSettingsPanel />
          {showLayers ? (
            <EmptyPanel
              icon={<PenSquare className="h-4 w-4" />}
              title="Nothing selected"
              body="Use the Layers tab or click directly on the canvas. Once something is selected this view becomes a focused inspector instead of a long mixed panel."
            />
          ) : null}
        </div>
      );
    }

    if (selectedIds.length > 1) {
      return (
        <div className="flex flex-col gap-4">
          <Section title="Multi-Selection" badge={`${selectedIds.length} items`}>
            <div className="grid grid-cols-2 gap-2">
              <TinyStat label="Items" value={String(selectedIds.length)} />
              <TinyStat label="Bounds" value={selectionBounds} />
            </div>
            <div className="rounded-lg border border-border/70 bg-background px-3 py-2.5 text-xs leading-relaxed text-foreground/55">
              Group them, change their visibility, or move their z-order from here. Detailed fields stay intentionally hidden until you focus one object.
            </div>
            {renderSelectionActions()}
          </Section>
        </div>
      );
    }

    if (!selectedNode) return null;

    const nodeSpecificFields = (
      <NodeSpecificFields
        node={selectedNode}
        onPatch={(patch) => commitPatch(selectedNode, patch)}
        onDrill={(id) => setDrillScope(id)}
      />
    );

    return (
      <div className="flex flex-col gap-4">
        <Section title="Selection" badge={selectedNode.type}>
          <div className="rounded-lg border border-border/70 bg-background px-3 py-3">
            <div className="flex items-start gap-3">
              <div className="rounded-lg border border-border/70 bg-foreground/[0.04] p-2 text-foreground/55">
                {getNodeIcon(selectedNode)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold tracking-[-0.01em] text-foreground/88">{selectedNode.name}</div>
                <div className="mt-1 text-xs text-foreground/55">
                  {getNodeMeta(selectedNode)} · {getBoundsLabel(selectedNode)} at {selectedNode.bounds.x},{selectedNode.bounds.y}
                </div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <TinyStat label="Position" value={`${selectedNode.bounds.x}, ${selectedNode.bounds.y}`} />
              <TinyStat label="Frame" value={getBoundsLabel(selectedNode)} />
            </div>
            <div className="mt-3">{renderSelectionActions()}</div>
          </div>
        </Section>

        <Section title="Object" badge="Core">
          <FieldRow label="type">
            <div className="rounded-lg border border-border/70 bg-background px-2.5 py-2 text-xs font-mono text-foreground/70">
              {selectedNode.type}
            </div>
          </FieldRow>
          <FieldRow label="name">
            <CommitTextInput
              value={selectedNode.name}
              onCommit={(name) => commitPatch(selectedNode, { name })}
            />
          </FieldRow>
          <FieldRow label="visible">
            <BooleanToggle
              value={selectedNode.visible}
              onChange={(visible) => {
                pushUndo();
                setNodeVisibility(selectedNode.id, visible);
              }}
            />
          </FieldRow>
        </Section>

        <Section title="Bounds" badge="Layout">
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
        </Section>

        {hasNodeSpecificFields(selectedNode) ? (
          <Section title="Content" badge="Type Props">
            {nodeSpecificFields}
          </Section>
        ) : null}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {showLayers ? (
        <div className="sticky top-0 z-10 -mx-1 rounded-xl border border-border/70 bg-background/92 p-1 shadow-sm backdrop-blur-sm">
          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('layers')}
              className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] ${
                activeTab === 'layers'
                  ? 'bg-[#2563eb] text-white shadow-sm'
                  : 'text-foreground/55 hover:bg-foreground/5'
              }`}
            >
              <Layers3 className="h-3.5 w-3.5" />
              Layers
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('inspect')}
              className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] ${
                activeTab === 'inspect'
                  ? 'bg-[#2563eb] text-white shadow-sm'
                  : 'text-foreground/55 hover:bg-foreground/5'
              }`}
            >
              <PenSquare className="h-3.5 w-3.5" />
              Inspect
            </button>
          </div>
        </div>
      ) : null}

      {showLayers && activeTab === 'layers' ? renderLayersTab() : renderInspectTab()}
    </div>
  );
}

export function PropertiesPanel() {
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const doc = useEditorStore((s) => s.document);

  return (
    <aside className="hidden md:flex h-full w-[280px] min-w-[280px] flex-col border-l border-border/60 bg-[linear-gradient(180deg,rgba(37,99,235,0.04),transparent_120px)] bg-background/95">
      <div className="border-b border-border/60 px-3 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground/30">Workspace</div>
            <div className="mt-1 text-sm font-semibold tracking-[-0.01em] text-foreground/88">Layers & Inspect</div>
          </div>
          <div className="rounded-full border border-border/70 bg-background px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-foreground/45">
            {selectedIds.length > 0 ? `${selectedIds.length} selected` : `${doc.nodes.size} objects`}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <PropertiesPanelContent />
      </div>
    </aside>
  );
}
