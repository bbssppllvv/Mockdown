import { Editor } from '@/components/editor/Editor';

export default function Home() {
  return (
    <>
      <h1 className="sr-only">Mockdown — ASCII Wireframe Editor</h1>
      <Editor />
      <noscript>
        <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
          <h2>Mockdown — ASCII Wireframe Editor</h2>
          <p>
            Free browser-based ASCII wireframe editor. Design UI mockups, lo-fi
            prototypes, and text diagrams with drag-and-drop components — no
            signup required.
          </p>
          <p>Please enable JavaScript to use Mockdown.</p>
        </div>
      </noscript>
    </>
  );
}
