export interface SprayToolSettings {
  radius: number;
  density: number;
}

export interface ModalToolSettings {
  defaultWidth: number;
  defaultHeight: number;
  defaultTitle: string;
}

export interface PencilToolSettings {
  char: string;
}

export interface BrushToolSettings {
  nibSize: number;
}

export interface ScatterToolSettings {
  radius: number;
  density: number;
}

export interface SmudgeToolSettings {
  radius: number;
}

export interface FillToolSettings {
  char: string;
}

export interface CardToolSettings {
  defaultTitle: string;
  defaultWidth: number;
  defaultHeight: number;
}

export interface TableToolSettings {
  defaultColumns: string;
  defaultColWidth: number;
}

export interface NavToolSettings {
  defaultLogo: string;
  defaultLinks: string;
  defaultAction: string;
}

export interface TabsToolSettings {
  defaultTabs: string;
}

export interface ToolSettings {
  spray: SprayToolSettings;
  modal: ModalToolSettings;
  pencil: PencilToolSettings;
  brush: BrushToolSettings;
  scatter: ScatterToolSettings;
  smudge: SmudgeToolSettings;
  fill: FillToolSettings;
  card: CardToolSettings;
  table: TableToolSettings;
  nav: NavToolSettings;
  tabs: TabsToolSettings;
}

export const DEFAULT_TOOL_SETTINGS: ToolSettings = {
  spray: {
    radius: 3,
    density: 5,
  },
  modal: {
    defaultWidth: 30,
    defaultHeight: 10,
    defaultTitle: 'Dialog',
  },
  pencil: {
    char: '\u2588',
  },
  brush: {
    nibSize: 5,
  },
  scatter: {
    radius: 4,
    density: 3,
  },
  smudge: {
    radius: 3,
  },
  fill: {
    char: '\u2588',
  },
  card: {
    defaultTitle: 'Title',
    defaultWidth: 20,
    defaultHeight: 8,
  },
  table: {
    defaultColumns: 'Col A, Col B, Col C',
    defaultColWidth: 10,
  },
  nav: {
    defaultLogo: 'Logo',
    defaultLinks: 'Link, Link, Link',
    defaultAction: 'Action',
  },
  tabs: {
    defaultTabs: 'Tab 1, Tab 2, Tab 3',
  },
};
