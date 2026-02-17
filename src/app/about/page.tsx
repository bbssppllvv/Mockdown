import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About Mockdown — Free ASCII Wireframe Editor',
  description:
    'Mockdown is a free, browser-based ASCII wireframe editor for designers, developers, and product managers. Create lo-fi UI mockups, text diagrams, and rapid prototypes — no signup, no install.',
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'About Mockdown — Free ASCII Wireframe Editor',
    description:
      'Create lo-fi UI mockups, text diagrams, and rapid prototypes in your browser. Free, instant, no signup.',
    url: '/about',
  },
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-border/60">
        <Link href="/" className="font-bold text-lg tracking-tight">
          Mockdown
        </Link>
        <Link
          href="/"
          className="text-sm font-medium px-4 py-2 rounded-lg bg-[#2979FF] text-white hover:bg-[#2563eb] transition-colors"
        >
          Open Editor
        </Link>
      </nav>

      <article className="max-w-2xl mx-auto px-6 py-16 space-y-12">
        <header className="space-y-4">
          <h1 className="text-3xl font-bold tracking-tight">
            ASCII Wireframe Editor for Rapid Prototyping
          </h1>
          <p className="text-lg text-foreground/70 leading-relaxed">
            Mockdown is a free, browser-based tool for creating UI wireframes
            using ASCII art. Drag-and-drop components, draw freehand, and export
            clean text mockups — all without leaving your browser.
          </p>
        </header>

        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight">
            Why ASCII Wireframes?
          </h2>
          <p className="text-foreground/70 leading-relaxed">
            ASCII wireframes are the fastest way to sketch UI ideas. They
            live in plain text — paste them into GitHub issues, Slack messages,
            code comments, or documentation. No image files, no design tool
            licenses, no friction.
          </p>
          <p className="text-foreground/70 leading-relaxed">
            Unlike pixel-perfect mockup tools, text wireframes keep the focus
            on structure and flow. They&apos;re inherently lo-fi, which
            means faster feedback cycles and less attachment to visual polish
            during early exploration.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight">
            What You Can Build
          </h2>
          <ul className="space-y-3 text-foreground/70">
            <li className="flex gap-3 leading-relaxed">
              <span className="text-[#2979FF] font-bold shrink-0">+</span>
              <span>
                <strong className="text-foreground">UI mockups</strong> —
                buttons, inputs, dropdowns, modals, tables, tabs, navigation
                bars, and 20+ other components
              </span>
            </li>
            <li className="flex gap-3 leading-relaxed">
              <span className="text-[#2979FF] font-bold shrink-0">+</span>
              <span>
                <strong className="text-foreground">Page layouts</strong> —
                arrange components on an infinite canvas to prototype full
                screens and user flows
              </span>
            </li>
            <li className="flex gap-3 leading-relaxed">
              <span className="text-[#2979FF] font-bold shrink-0">+</span>
              <span>
                <strong className="text-foreground">Text diagrams</strong> —
                freehand drawing with pencil, brush, and spray tools for
                flowcharts and architecture sketches
              </span>
            </li>
            <li className="flex gap-3 leading-relaxed">
              <span className="text-[#2979FF] font-bold shrink-0">+</span>
              <span>
                <strong className="text-foreground">Documentation assets</strong> —
                export as Markdown and embed directly in READMEs, wikis, or
                technical specs
              </span>
            </li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight">How It Works</h2>
          <ol className="space-y-4 text-foreground/70">
            <li className="flex gap-3 leading-relaxed">
              <span className="text-[#2979FF] font-bold shrink-0">1.</span>
              <span>
                <strong className="text-foreground">Pick a component</strong>{' '}
                from the toolbar — buttons, inputs, cards, tables, or any of
                the 20+ built-in UI elements.
              </span>
            </li>
            <li className="flex gap-3 leading-relaxed">
              <span className="text-[#2979FF] font-bold shrink-0">2.</span>
              <span>
                <strong className="text-foreground">
                  Draw on the canvas
                </strong>{' '}
                — click and drag to place components. Double-click any text to
                edit it inline.
              </span>
            </li>
            <li className="flex gap-3 leading-relaxed">
              <span className="text-[#2979FF] font-bold shrink-0">3.</span>
              <span>
                <strong className="text-foreground">Export and share</strong> —
                copy your wireframe as Markdown text and paste it anywhere:
                GitHub, Notion, Slack, or your codebase.
              </span>
            </li>
          </ol>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight">Who It&apos;s For</h2>
          <div className="space-y-3 text-foreground/70">
            <p className="leading-relaxed">
              <strong className="text-foreground">Developers</strong> who
              sketch UI in code comments and want a faster way to create text
              mockups.
            </p>
            <p className="leading-relaxed">
              <strong className="text-foreground">Product managers</strong> who
              need to communicate layout ideas quickly without waiting for a
              designer.
            </p>
            <p className="leading-relaxed">
              <strong className="text-foreground">Designers</strong> who want a
              constraint-based tool for early-stage exploration before jumping
              into Figma.
            </p>
            <p className="leading-relaxed">
              <strong className="text-foreground">Technical writers</strong> who
              embed interface diagrams in documentation and want them to stay
              in plain text.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight">
            Free, Private, Instant
          </h2>
          <p className="text-foreground/70 leading-relaxed">
            Mockdown runs entirely in your browser. No accounts, no cloud
            storage, no tracking. Your wireframes never leave your device.
            Just open the editor and start designing.
          </p>
        </section>

        <div className="pt-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#2979FF] text-white font-medium hover:bg-[#2563eb] transition-colors"
          >
            Open the Editor
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </article>

      <footer className="border-t border-border/60 py-8 px-6 text-center text-xs text-foreground/40">
        <Link href="/" className="hover:text-foreground/60 transition-colors">
          Mockdown
        </Link>{' '}
        — Free ASCII Wireframe Editor
      </footer>
    </main>
  );
}
