export interface SprayToolSettings {
  radius: number;
  density: number;
}

export interface ModalToolSettings {
  defaultWidth: number;
  defaultHeight: number;
  defaultTitle: string;
}

export interface ToolSettings {
  spray: SprayToolSettings;
  modal: ModalToolSettings;
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
};
