// Re-export everything from the scene store for backward compatibility.
// All code should import from this file (or use-scene-store directly).
export { useSceneStore, useSceneStore as useEditorStore } from './use-scene-store';
export type { GenerateSelection, SelectInteraction } from './use-scene-store';
