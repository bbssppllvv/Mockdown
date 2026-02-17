import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About Mockdown — Free ASCII Wireframe Editor',
  description:
    'Mockdown is a free, browser-based ASCII wireframe editor. 20+ drag-and-drop UI components — buttons, inputs, tables, modals, nav bars. Export as Markdown. No signup, works offline.',
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'About Mockdown — Free ASCII Wireframe Editor',
    description:
      'ASCII wireframe editor in your browser. 20+ components, Markdown export, no signup. Sketch UI in plain text.',
    url: '/about',
  },
};

function Ascii({ children }: { children: string }) {
  return (
    <pre className="text-[13px] leading-snug text-foreground/70 select-none overflow-x-auto">
      {children}
    </pre>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="text-[10px] uppercase tracking-[0.2em] text-foreground/30 font-bold mb-6">
      {`// ${children}`}
    </div>
  );
}

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-background text-foreground font-mono">
      {/* ── Nav ── */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-border/60">
        <Link href="/" className="font-bold text-lg tracking-tight">
          Mockdown
        </Link>
        <Link
          href="/"
          className="text-sm font-medium px-4 py-2 bg-[#2979FF] text-white hover:bg-[#2563eb] transition-colors"
        >
          [ Open Editor ]
        </Link>
      </nav>

      <article className="max-w-2xl mx-auto px-6 py-16">
        {/* ── Hero ── */}
        <header className="mb-20">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[#2979FF] mb-6">
            Wireframes that live
            <br />
            in plain text.
          </h1>
          <p className="text-lg text-foreground/60 leading-relaxed max-w-lg">
            20+ UI components. Drag, drop, export as Markdown.
            <br />
            Open your browser — that&apos;s the install.
          </p>
        </header>

        {/* ── Why ── */}
        <section className="mb-20">
          <SectionLabel>Why plain text</SectionLabel>
          <h2 className="text-xl font-bold text-[#2979FF] mb-4">
            Your mockup is a text file.
          </h2>
          <div className="space-y-4 text-foreground/60 leading-relaxed">
            <p>
              Paste it in a GitHub issue. Drop it in Slack. Commit it with your
              code. No screenshots, no broken image links, no &quot;can you
              export that as PNG?&quot;
            </p>
            <p>
              Text wireframes keep the conversation on structure, not color.
              Feedback comes faster when there&apos;s nothing to polish.
            </p>
          </div>
        </section>

        {/* ── Components ── */}
        <section className="mb-20">
          <SectionLabel>Component library</SectionLabel>
          <h2 className="text-xl font-bold text-[#2979FF] mb-3">
            20+ ASCII components. All drag-and-drop.
          </h2>
          <p className="text-foreground/40 text-sm mb-8">
            Every component below is built into Mockdown. Click, drag, place.
            Double-click to edit text inline.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border/40">
            {/* Form controls */}
            <div className="bg-background p-5 space-y-4">
              <div className="text-[11px] uppercase tracking-widest text-foreground/30 font-bold">
                Form controls
              </div>
              <Ascii>{`[ Submit ]  [ Cancel ]

[________________]

[▾ Select option  ]

[/ Search...      ]

☑ Remember me
☐ Send notifications

● Dark   ○ Light

[━●] Autosave`}</Ascii>
            </div>

            {/* Data display */}
            <div className="bg-background p-5 space-y-4">
              <div className="text-[11px] uppercase tracking-widest text-foreground/30 font-bold">
                Data display
              </div>
              <Ascii>{`[████████░░░░░░] 60%

• Design system
• Component API
• Export formats

Home > Docs > Components

< 1 2 [3] 4 5 >`}</Ascii>
            </div>

            {/* Containers */}
            <div className="bg-background p-5 space-y-4">
              <div className="text-[11px] uppercase tracking-widest text-foreground/30 font-bold">
                Containers
              </div>
              <Ascii>{`┌──────────────────┐
│ Card Title       │
├──────────────────┤
│                  │
│  Content area.   │
│                  │
└──────────────────┘

┌──────┬───────────┐
│ Col A│ Col B     │
├──────┼───────────┤
│ Row 1│ Data      │
│ Row 2│ Data      │
└──────┴───────────┘`}</Ascii>
            </div>

            {/* Navigation */}
            <div className="bg-background p-5 space-y-4">
              <div className="text-[11px] uppercase tracking-widest text-foreground/30 font-bold">
                Navigation
              </div>
              <Ascii>{`Logo  Link  Link   [ Action ]
─────────────────────────────

[ Tab 1 ]  Tab 2   Tab 3
─────────────────────────

┌────────────────────────┐
│ Dialog Title         × │
├────────────────────────┤
│                        │
│  Are you sure?         │
│                        │
│   [ Cancel ] [ OK ]    │
└────────────────────────┘`}</Ascii>
            </div>
          </div>

          <p className="text-foreground/30 text-xs mt-4">
            + lines, arrows, freehand drawing, boxes, placeholders, split
            panels, and text blocks.
          </p>
        </section>

        {/* ── How it works ── */}
        <section className="mb-20">
          <SectionLabel>Three steps</SectionLabel>
          <h2 className="text-xl font-bold text-[#2979FF] mb-6">
            Sketch it. Copy it. Paste it in Slack.
          </h2>
          <div className="space-y-6">
            <div className="flex gap-4">
              <span className="text-[#2979FF] font-bold shrink-0 w-6">01</span>
              <div>
                <strong className="text-foreground">Pick a component</strong>
                <span className="text-foreground/50">
                  {' '}— button, card, table, modal.
                  Click the toolbar, drag onto the canvas.
                </span>
              </div>
            </div>
            <div className="flex gap-4">
              <span className="text-[#2979FF] font-bold shrink-0 w-6">02</span>
              <div>
                <strong className="text-foreground">Edit inline</strong>
                <span className="text-foreground/50">
                  {' '}— double-click any text to rewrite it.
                  Components resize to fit your content.
                </span>
              </div>
            </div>
            <div className="flex gap-4">
              <span className="text-[#2979FF] font-bold shrink-0 w-6">03</span>
              <div>
                <strong className="text-foreground">Copy as Markdown</strong>
                <span className="text-foreground/50">
                  {' '}— one click. Paste into GitHub, Notion,
                  Confluence, or a code comment. Done.
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Who ── */}
        <section className="mb-20">
          <SectionLabel>Who uses this</SectionLabel>
          <h2 className="text-xl font-bold text-[#2979FF] mb-6">
            For people who think in structure, not pixels.
          </h2>
          <div className="space-y-4 text-foreground/50 leading-relaxed">
            <p>
              <strong className="text-foreground">The developer</strong> who
              sketches a login form in a code comment before writing the first
              line of JSX.
            </p>
            <p>
              <strong className="text-foreground">The PM</strong> who needs to
              show a layout idea in a Jira ticket — not next sprint, now.
            </p>
            <p>
              <strong className="text-foreground">The designer</strong> who
              wants to explore 5 layout options in 10 minutes before opening
              Figma.
            </p>
            <p>
              <strong className="text-foreground">The tech writer</strong> who
              embeds UI diagrams in docs and wants them to survive every format
              conversion.
            </p>
          </div>
        </section>

        {/* ── Conditions ── */}
        <section className="mb-20">
          <SectionLabel>No strings</SectionLabel>
          <h2 className="text-xl font-bold text-[#2979FF] mb-4">
            Free. Private. Offline-ready.
          </h2>
          <p className="text-foreground/50 leading-relaxed">
            Runs in your browser. No account, no cloud, no tracking.
            Your wireframes stay on your device.
          </p>
        </section>

        {/* ── CTA ── */}
        <div className="border-t border-border/60 pt-12">
          <Ascii>{`┌─────────────────────────────────┐
│                                 │
│    20+ components.              │
│    Zero signup.                 │
│    Works right now.             │
│                                 │
└─────────────────────────────────┘`}</Ascii>
          <div className="mt-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#2979FF] text-white font-medium hover:bg-[#2563eb] transition-colors"
            >
              [ Open the Editor &rarr; ]
            </Link>
          </div>
        </div>
      </article>

      <footer className="border-t border-border/60 py-8 px-6 text-center text-xs text-foreground/30">
        <Link href="/" className="hover:text-foreground/50 transition-colors">
          Mockdown
        </Link>
        {' · '}
        ASCII wireframe editor
      </footer>
    </main>
  );
}
