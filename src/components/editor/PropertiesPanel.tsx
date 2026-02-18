'use client';

import { type ReactNode, useMemo, useState } from 'react';
import { useEditorStore } from '@/hooks/use-editor-store';
import { GroupNode, SceneDocument, SceneNode } from '@/lib/scene/types';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-[10px] font-semibold text-foreground/30 uppercase tracking-wider">
        {title}
      </div>
      {children}
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex items-center gap-2 text-xs">
      <span className="w-20 shrink-0 text-foreground/50">{label}</span>
      <div className="flex-1">{children}</div>
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
  if (multiline) {
    return (
      <textarea
        key={value}
        defaultValue={value}
        onBlur={(e) => {
          const next = e.currentTarget.value;
          if (next !== value) onCommit(next);
        }}
        rows={3}
        className="w-full rounded-md border border-border/70 bg-background px-2 py-1 text-xs font-mono"
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
      className="w-full rounded-md border border-border/70 bg-background px-2 py-1 text-xs font-mono"
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
      className="w-full rounded-md border border-border/70 bg-background px-2 py-1 text-xs font-mono"
    />
  );
}

function BooleanToggle({ value, onChange }: { value: boolean; onChange: (next: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`w-full rounded-md border px-2 py-1 text-xs font-semibold transition-colors ${
        value
          ? 'border-[#2563eb]/40 bg-[#2563eb]/10 text-[#2563eb]'
          : 'border-border/70 text-foreground/60 hover:bg-foreground/5'
      }`}
    >
      {value ? 'ON' : 'OFF'}
    </button>
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
  prefix: string;
  isGroup: boolean;
  collapsed: boolean;
}

function buildLayerRows(
  doc: SceneDocument,
  ids: string[],
  collapsedGroupIds: Set<string>,
  prefix: string = ''
): LayerRow[] {
  const rows: LayerRow[] = [];
  const orderedIds = [...ids].reverse();

  for (let i = 0; i < orderedIds.length; i++) {
    const id = orderedIds[i];
    const node = doc.nodes.get(id);
    if (!node) continue;

    const isLast = i === orderedIds.length - 1;
    const branch = isLast ? '└─' : '├─';
    const isGroup = node.type === 'group';
    const collapsed = isGroup && collapsedGroupIds.has(node.id);

    rows.push({
      node,
      prefix: `${prefix}${branch}`,
      isGroup,
      collapsed,
    });

    if (isGroup && !collapsed) {
      const nextPrefix = `${prefix}${isLast ? '  ' : '│ '}`;
      rows.push(...buildLayerRows(doc, (node as GroupNode).childIds, collapsedGroupIds, nextPrefix));
    }
  }

  return rows;
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
          <div className="text-xs text-foreground/50">
            {node.childIds.length} child objects
          </div>
          <button
            onClick={() => onDrill(node.id)}
            className="w-full rounded-md border border-border/70 px-2 py-1 text-xs font-semibold text-foreground/70 hover:bg-foreground/5"
          >
            Edit Inside Group
          </button>
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
      <Section title="Spray Settings">
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
      <Section title="Modal Defaults">
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
    <div className="text-xs text-foreground/50 leading-relaxed">
      Select an object to edit it, or choose `spray`/`modal` to adjust tool defaults.
    </div>
  );
}

export function PropertiesPanel() {
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const doc = useEditorStore((s) => s.document);
  const drillScope = useEditorStore((s) => s.drillScope);
  const setDrillScope = useEditorStore((s) => s.setDrillScope);
  const updateNode = useEditorStore((s) => s.updateNode);
  const moveNodes = useEditorStore((s) => s.moveNodes);
  const resizeNode = useEditorStore((s) => s.resizeNode);
  const setNodeVisibility = useEditorStore((s) => s.setNodeVisibility);
  const setSelection = useEditorStore((s) => s.setSelection);
  const pushUndo = useEditorStore((s) => s.pushUndo);
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<Set<string>>(new Set());

  const singleId = selectedIds.length === 1 ? selectedIds[0] : null;
  const selectedNode = singleId ? doc.nodes.get(singleId) ?? null : null;
  const drillNode = drillScope ? doc.nodes.get(drillScope) : null;
  const layerRootIds = drillNode && drillNode.type === 'group' ? drillNode.childIds : doc.rootOrder;
  const layerRows = useMemo(
    () => buildLayerRows(doc, layerRootIds, collapsedGroupIds),
    [doc, layerRootIds, collapsedGroupIds]
  );

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

  const toggleGroupCollapse = (id: string) => {
    setCollapsedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <aside className="hidden md:flex w-[280px] min-w-[280px] h-full border-l border-border/60 bg-background/95 flex-col">
      <div className="px-3 py-2 border-b border-border/60">
        <div className="text-[10px] font-semibold text-foreground/30 uppercase tracking-wider">Inspector</div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4">
        {drillNode && drillNode.type === 'group' && (
          <div className="rounded-md border border-border/70 bg-foreground/5 p-2 text-xs">
            <div className="font-semibold text-foreground/70">Inside Group: {drillNode.name}</div>
            <button
              onClick={() => setDrillScope(null)}
              className="mt-2 rounded-md border border-border/70 px-2 py-1 text-[11px] font-semibold text-foreground/60 hover:bg-background"
            >
              Exit Group
            </button>
          </div>
        )}

        {selectedIds.length === 0 && <ToolSettingsPanel />}

        <Section title={drillScope ? 'Layers (Scope)' : 'Layers'}>
          <div className="rounded-md border border-border/70 bg-foreground/5 p-1 flex flex-col gap-1">
            {layerRows.length === 0 && (
              <div className="text-xs text-foreground/40 px-1 py-1">No objects</div>
            )}
            {layerRows.map((row) => {
              const node = row.node;
              const selected = selectedIds.includes(node.id);
              return (
                <div key={node.id} className="flex items-center gap-1">
                  <button
                    onClick={() => row.isGroup && toggleGroupCollapse(node.id)}
                    className="min-w-8 rounded border border-border/70 px-1 py-0.5 text-[11px] font-mono text-foreground/60 hover:bg-background"
                    title={row.isGroup ? (row.collapsed ? 'Expand group' : 'Collapse group') : 'Item'}
                  >
                    {row.isGroup ? (row.collapsed ? '[+]' : '[-]') : '[ ]'}
                  </button>
                  <button
                    onClick={() => {
                      pushUndo();
                      setNodeVisibility(node.id, !node.visible);
                    }}
                    className="min-w-8 rounded border border-border/70 px-1 py-0.5 text-[11px] font-mono text-foreground/60 hover:bg-background"
                    title={node.visible ? 'Hide' : 'Show'}
                  >
                    {node.visible ? '[x]' : '[ ]'}
                  </button>
                  <button
                    onClick={() => setSelection([node.id])}
                    onDoubleClick={() => {
                      if (node.type === 'group') setDrillScope(node.id);
                    }}
                    className={`flex-1 text-left rounded border px-1.5 py-0.5 text-[11px] font-mono whitespace-pre ${
                      selected
                        ? 'border-[#2563eb]/40 bg-[#2563eb]/10 text-[#2563eb]'
                        : 'border-border/70 text-foreground/70 hover:bg-background'
                    }`}
                    title={node.type === 'group' ? 'Double click to enter group' : undefined}
                  >
                    {`${row.prefix}${node.name} (${node.type})`}
                  </button>
                </div>
              );
            })}
          </div>
        </Section>

        {selectedIds.length > 1 && (
          <div className="text-xs text-foreground/50 leading-relaxed">
            {selectedIds.length} objects selected. Use single selection to edit detailed properties.
          </div>
        )}

        {selectedNode && (
          <>
            <Section title="Object">
              <FieldRow label="type">
                <div className="rounded-md border border-border/70 px-2 py-1 text-xs font-mono text-foreground/70 bg-foreground/5">
                  {selectedNode.type}
                </div>
              </FieldRow>
              <FieldRow label="name">
                <CommitTextInput
                  value={selectedNode.name}
                  onCommit={(name) => commitPatch(selectedNode, { name })}
                />
              </FieldRow>
            </Section>

            <Section title="Bounds">
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

            <Section title="Type Props">
              <NodeSpecificFields
                node={selectedNode}
                onPatch={(patch) => commitPatch(selectedNode, patch)}
                onDrill={(id) => setDrillScope(id)}
              />
            </Section>
          </>
        )}
      </div>
    </aside>
  );
}
