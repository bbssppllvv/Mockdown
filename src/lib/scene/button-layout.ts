import { ButtonNode } from './types';

export function getButtonInnerWidth(node: ButtonNode): number {
  return Math.max(0, node.bounds.width - 2);
}

export function getButtonVisibleLabel(node: ButtonNode): string {
  const label = node.label || 'OK';
  return label.slice(0, getButtonInnerWidth(node));
}

export function getButtonLabelRow(node: ButtonNode): number {
  return node.bounds.y + Math.floor((node.bounds.height - 1) / 2);
}

export function getButtonLabelStart(node: ButtonNode): number {
  const innerWidth = getButtonInnerWidth(node);
  const visibleLabel = getButtonVisibleLabel(node);
  const leadingSpaces = Math.max(0, Math.floor((innerWidth - visibleLabel.length) / 2));
  return node.bounds.x + 1 + leadingSpaces;
}
