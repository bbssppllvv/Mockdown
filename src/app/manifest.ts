import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Mockdown — ASCII Wireframe Editor',
    short_name: 'Mockdown',
    description:
      'Free browser-based ASCII wireframe editor. Design UI mockups, lo-fi prototypes, and text diagrams with drag-and-drop components — no signup required.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#2979FF',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}
