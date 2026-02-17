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

/* ── tiny wireframe primitives ── */

const B = '#2979FF'; // brand blue


function WireCard({
  title,
  children,
  className = '',
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`border ${className}`} style={{ borderColor: B }}>
      {title && (
        <>
          <div
            className="px-4 py-2 text-sm font-bold"
            style={{ color: B }}
          >
            {title}
          </div>
          <div className="border-t" style={{ borderColor: B }} />
        </>
      )}
      <div className="px-4 py-4">{children}</div>
    </div>
  );
}

function WireBox({
  children,
  className = '',
  dashed = false,
}: {
  children: React.ReactNode;
  className?: string;
  dashed?: boolean;
}) {
  return (
    <div
      className={`border ${dashed ? 'border-dashed' : ''} ${className}`}
      style={{ borderColor: B }}
    >
      {children}
    </div>
  );
}

function WireButton({
  children,
  href,
}: {
  children: React.ReactNode;
  href?: string;
}) {
  const cls =
    'inline-block border px-4 py-2 text-sm font-bold transition-colors hover:bg-[#2979FF] hover:text-white';
  if (href) {
    return (
      <Link href={href} className={cls} style={{ borderColor: B, color: B }}>
        {children}
      </Link>
    );
  }
  return (
    <span className={cls} style={{ borderColor: B, color: B }}>
      {children}
    </span>
  );
}

function WireInput({ placeholder }: { placeholder: string }) {
  return (
    <div
      className="border-b border-dashed px-1 py-1 text-sm"
      style={{ borderColor: B, color: `${B}99` }}
    >
      {placeholder}
    </div>
  );
}

function WireNav() {
  return (
    <div className="border-b" style={{ borderColor: B }}>
      <div className="max-w-4xl mx-auto flex items-center justify-between px-6 py-3">
        <Link
          href="/"
          className="font-bold text-base"
          style={{ color: B }}
        >
          Mockdown
        </Link>
        <div className="flex items-center gap-6">
          <span className="text-sm hidden sm:inline" style={{ color: `${B}88` }}>
            About
          </span>
          <WireButton href="/">Open Editor</WireButton>
        </div>
      </div>
    </div>
  );
}

function WireTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: string[][];
}) {
  return (
    <div className="border overflow-x-auto" style={{ borderColor: B }}>
      <div
        className="grid border-b"
        style={{
          gridTemplateColumns: `repeat(${columns.length}, 1fr)`,
          borderColor: B,
        }}
      >
        {columns.map((col, i) => (
          <div
            key={col}
            className={`px-3 py-2 text-sm font-bold ${i > 0 ? 'border-l' : ''}`}
            style={{ color: B, borderColor: B }}
          >
            {col}
          </div>
        ))}
      </div>
      {rows.map((row, ri) => (
        <div
          key={ri}
          className={`grid ${ri > 0 ? 'border-t' : ''}`}
          style={{
            gridTemplateColumns: `repeat(${columns.length}, 1fr)`,
            borderColor: B,
          }}
        >
          {row.map((cell, ci) => (
            <div
              key={ci}
              className={`px-3 py-2 text-sm ${ci > 0 ? 'border-l' : ''}`}
              style={{ color: `${B}cc`, borderColor: B }}
            >
              {cell}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ── page ── */

export default function AboutPage() {
  return (
    <main
      className="min-h-screen font-mono"
      style={{
        backgroundColor: '#fafbff',
        backgroundImage: `
          linear-gradient(${B}11 1px, transparent 1px),
          linear-gradient(90deg, ${B}11 1px, transparent 1px)
        `,
        backgroundSize: '24px 24px',
        color: '#1a1a2e',
      }}
    >
      <WireNav />

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-10">
        {/* ── Hero: Dialog wireframe ── */}
        <WireCard title="Mockdown">
          <div className="space-y-4">
            <h1
              className="text-2xl md:text-3xl font-bold leading-tight"
              style={{ color: B }}
            >
              Wireframes that live in plain text.
            </h1>
            <p className="text-sm leading-relaxed max-w-lg" style={{ color: `${B}99` }}>
              20+ UI components. Drag, drop, export as Markdown.
              Open your browser — that&apos;s the install.
            </p>
            <div className="flex gap-3 pt-2">
              <WireButton href="/">Open Editor</WireButton>
              <WireButton href="#components">See Components</WireButton>
            </div>
          </div>
        </WireCard>

        {/* ── Why: Split panel ── */}
        <div className="grid md:grid-cols-2 gap-px">
          <WireCard title="Why plain text?">
            <div className="space-y-3 text-sm leading-relaxed" style={{ color: `${B}bb` }}>
              <p>
                Paste your mockup in a GitHub issue. Drop it in Slack.
                Commit it with your code.
              </p>
              <p>
                No screenshots. No broken image links.
                No &quot;can you export that as PNG?&quot;
              </p>
            </div>
          </WireCard>

          <WireCard title="Why lo-fi?">
            <div className="space-y-3 text-sm leading-relaxed" style={{ color: `${B}bb` }}>
              <p>
                Text wireframes keep the conversation on structure, not color.
              </p>
              <p>
                Feedback comes faster when there&apos;s nothing to polish.
                Five layout options in ten minutes.
              </p>
            </div>
          </WireCard>
        </div>

        {/* ── Components showcase ── */}
        <section id="components">
          <WireCard title="Component Library — 20+ built-in elements">
            <p className="text-xs mb-6" style={{ color: `${B}77` }}>
              Every component below is built into Mockdown. Drag to place, double-click to edit.
            </p>

            {/* Form controls row */}
            <div className="space-y-6">
              <div>
                <div
                  className="text-xs font-bold uppercase tracking-widest mb-3"
                  style={{ color: `${B}66` }}
                >
                  Form controls
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <WireBox className="p-3 text-center">
                    <div className="text-xs mb-2" style={{ color: `${B}88` }}>Button</div>
                    <WireButton>Submit</WireButton>
                  </WireBox>
                  <WireBox className="p-3">
                    <div className="text-xs mb-2" style={{ color: `${B}88` }}>Input</div>
                    <WireInput placeholder="Enter text..." />
                  </WireBox>
                  <WireBox className="p-3">
                    <div className="text-xs mb-2" style={{ color: `${B}88` }}>Dropdown</div>
                    <div
                      className="border px-2 py-1 text-sm flex justify-between"
                      style={{ borderColor: B, color: `${B}bb` }}
                    >
                      <span>Select</span>
                      <span>▾</span>
                    </div>
                  </WireBox>
                  <WireBox className="p-3">
                    <div className="text-xs mb-2" style={{ color: `${B}88` }}>Search</div>
                    <div
                      className="border px-2 py-1 text-sm"
                      style={{ borderColor: B, color: `${B}99` }}
                    >
                      / Search...
                    </div>
                  </WireBox>
                </div>
              </div>

              {/* Toggles row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <WireBox className="p-3">
                  <div className="text-xs mb-2" style={{ color: `${B}88` }}>Checkbox</div>
                  <div className="space-y-1 text-sm" style={{ color: `${B}bb` }}>
                    <div>☑ Enabled</div>
                    <div>☐ Disabled</div>
                  </div>
                </WireBox>
                <WireBox className="p-3">
                  <div className="text-xs mb-2" style={{ color: `${B}88` }}>Radio</div>
                  <div className="space-y-1 text-sm" style={{ color: `${B}bb` }}>
                    <div>● Option A</div>
                    <div>○ Option B</div>
                  </div>
                </WireBox>
                <WireBox className="p-3">
                  <div className="text-xs mb-2" style={{ color: `${B}88` }}>Toggle</div>
                  <div className="text-sm" style={{ color: `${B}bb` }}>
                    [━●] On
                  </div>
                </WireBox>
                <WireBox className="p-3">
                  <div className="text-xs mb-2" style={{ color: `${B}88` }}>Progress</div>
                  <div className="text-sm" style={{ color: `${B}bb` }}>
                    [████░░░░] 50%
                  </div>
                </WireBox>
              </div>

              {/* Navigation components */}
              <div>
                <div
                  className="text-xs font-bold uppercase tracking-widest mb-3"
                  style={{ color: `${B}66` }}
                >
                  Navigation
                </div>
                <div className="space-y-3">
                  <WireBox className="p-3">
                    <div className="text-xs mb-2" style={{ color: `${B}88` }}>Nav Bar</div>
                    <div className="flex items-center gap-4 text-sm" style={{ color: `${B}bb` }}>
                      <span className="font-bold" style={{ color: B }}>Logo</span>
                      <span>Link</span>
                      <span>Link</span>
                      <span>Link</span>
                      <span className="ml-auto">
                        <WireButton>Action</WireButton>
                      </span>
                    </div>
                  </WireBox>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <WireBox className="p-3">
                      <div className="text-xs mb-2" style={{ color: `${B}88` }}>Tabs</div>
                      <div className="flex gap-2 text-sm" style={{ color: `${B}bb` }}>
                        <span
                          className="border-b-2 pb-0.5"
                          style={{ borderColor: B, color: B }}
                        >
                          Active
                        </span>
                        <span className="pb-0.5">Tab 2</span>
                        <span className="pb-0.5">Tab 3</span>
                      </div>
                    </WireBox>
                    <WireBox className="p-3">
                      <div className="text-xs mb-2" style={{ color: `${B}88` }}>Breadcrumb</div>
                      <div className="text-sm" style={{ color: `${B}bb` }}>
                        Home &gt; Docs &gt; About
                      </div>
                    </WireBox>
                    <WireBox className="p-3">
                      <div className="text-xs mb-2" style={{ color: `${B}88` }}>Pagination</div>
                      <div className="text-sm" style={{ color: `${B}bb` }}>
                        &lt; 1 2 <span className="font-bold" style={{ color: B }}>[3]</span> 4 5 &gt;
                      </div>
                    </WireBox>
                  </div>
                </div>
              </div>

              {/* Containers */}
              <div>
                <div
                  className="text-xs font-bold uppercase tracking-widest mb-3"
                  style={{ color: `${B}66` }}
                >
                  Containers
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <WireCard title="Card Title">
                    <p className="text-sm" style={{ color: `${B}99` }}>
                      Cards group related content with a header and body area.
                    </p>
                  </WireCard>

                  <WireCard title="Dialog                                              ×">
                    <p className="text-sm mb-3" style={{ color: `${B}99` }}>
                      Are you sure?
                    </p>
                    <div className="flex gap-2">
                      <WireButton>Cancel</WireButton>
                      <WireButton>OK</WireButton>
                    </div>
                  </WireCard>
                </div>
              </div>

              {/* Table */}
              <div>
                <div
                  className="text-xs font-bold uppercase tracking-widest mb-3"
                  style={{ color: `${B}66` }}
                >
                  Data
                </div>
                <WireTable
                  columns={['Component', 'Type', 'Editable', 'Resizable']}
                  rows={[
                    ['Button', 'Form', '✓', '✓'],
                    ['Card', 'Container', '✓', '✓'],
                    ['Table', 'Data', '✓', '✓'],
                    ['Nav Bar', 'Navigation', '✓', '✓'],
                  ]}
                />
              </div>

              <p className="text-xs" style={{ color: `${B}66` }}>
                + lines, arrows, freehand pencil, brush, spray, boxes,
                placeholders, split panels, text blocks, and lists.
              </p>
            </div>
          </WireCard>
        </section>

        {/* ── How it works ── */}
        <WireCard title="How It Works">
          <div className="grid md:grid-cols-3 gap-4">
            <WireBox className="p-4" dashed>
              <div className="text-lg font-bold mb-2" style={{ color: B }}>01</div>
              <h3 className="text-sm font-bold mb-1" style={{ color: B }}>
                Pick a component
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: `${B}99` }}>
                Button, card, table, modal — click the toolbar, drag onto the canvas.
              </p>
            </WireBox>
            <WireBox className="p-4" dashed>
              <div className="text-lg font-bold mb-2" style={{ color: B }}>02</div>
              <h3 className="text-sm font-bold mb-1" style={{ color: B }}>
                Edit inline
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: `${B}99` }}>
                Double-click any text to rewrite it. Components resize to fit your content.
              </p>
            </WireBox>
            <WireBox className="p-4" dashed>
              <div className="text-lg font-bold mb-2" style={{ color: B }}>03</div>
              <h3 className="text-sm font-bold mb-1" style={{ color: B }}>
                Copy as Markdown
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: `${B}99` }}>
                One click. Paste into GitHub, Notion, Slack, or a code comment. Done.
              </p>
            </WireBox>
          </div>
        </WireCard>

        {/* ── Who ── */}
        <WireCard title="Who Uses This">
          <div className="grid md:grid-cols-2 gap-4">
            <WireBox className="p-4">
              <h3 className="text-sm font-bold mb-1" style={{ color: B }}>
                Developers
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: `${B}99` }}>
                Sketch a login form in a code comment before writing the first line of JSX.
              </p>
            </WireBox>
            <WireBox className="p-4">
              <h3 className="text-sm font-bold mb-1" style={{ color: B }}>
                Product Managers
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: `${B}99` }}>
                Show a layout idea in a Jira ticket — not next sprint, now.
              </p>
            </WireBox>
            <WireBox className="p-4">
              <h3 className="text-sm font-bold mb-1" style={{ color: B }}>
                Designers
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: `${B}99` }}>
                Explore 5 layout options in 10 minutes before opening Figma.
              </p>
            </WireBox>
            <WireBox className="p-4">
              <h3 className="text-sm font-bold mb-1" style={{ color: B }}>
                Technical Writers
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: `${B}99` }}>
                Embed UI diagrams in docs that survive every format conversion.
              </p>
            </WireBox>
          </div>
        </WireCard>

        {/* ── CTA ── */}
        <WireCard title="Get Started">
          <div className="text-center py-4 space-y-4">
            <p className="text-sm" style={{ color: `${B}bb` }}>
              Free. No account. No install. Works offline.
            </p>
            <div>
              <Link
                href="/"
                className="inline-block border-2 px-6 py-3 font-bold text-sm transition-colors hover:bg-[#2979FF] hover:text-white"
                style={{ borderColor: B, color: B }}
              >
                [ Open the Editor → ]
              </Link>
            </div>
          </div>
        </WireCard>
      </div>

      {/* ── Footer ── */}
      <div className="border-t py-6 px-6 text-center" style={{ borderColor: B }}>
        <p className="text-xs" style={{ color: `${B}66` }}>
          <Link href="/" className="hover:underline" style={{ color: `${B}88` }}>
            Mockdown
          </Link>
          {' · '}
          Free ASCII wireframe editor
          {' · '}
          Your wireframes stay on your device
        </p>
      </div>
    </main>
  );
}
