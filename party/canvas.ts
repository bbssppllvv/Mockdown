import type * as Party from 'partykit/server';

type CellChange = { row: number; col: number; char: string };
type ClientMessage =
  | { type: 'delta'; changes: CellChange[] }
  | { type: 'cursor'; row: number; col: number };

// Cell keys are stored individually as "c:row,col" → char
const CELL_PREFIX = 'c:';

const CURSOR_COLORS = [
  '#f43f5e', '#a855f7', '#3b82f6', '#14b8a6',
  '#f59e0b', '#ec4899', '#6366f1', '#22c55e',
];

// ---------- Fun name generator ----------

const ADJECTIVES = [
  'Swift', 'Sneaky', 'Cosmic', 'Fuzzy', 'Spicy',
  'Chill', 'Turbo', 'Sleepy', 'Brave', 'Dizzy',
  'Jolly', 'Funky', 'Lucky', 'Witty', 'Zany',
  'Peppy', 'Rusty', 'Jazzy', 'Nerdy', 'Cozy',
];

const ANIMALS = [
  'Panda', 'Fox', 'Otter', 'Owl', 'Cat',
  'Sloth', 'Koala', 'Frog', 'Duck', 'Llama',
  'Shiba', 'Moose', 'Crow', 'Axolotl', 'Capybara',
  'Quokka', 'Penguin', 'Raccoon', 'Hamster', 'Gecko',
];

function randomName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  return `${adj} ${animal}`;
}

// -----------------------------------------

interface UserInfo { color: string; name: string }

export default class CanvasServer implements Party.Server {
  private users = new Map<string, UserInfo>();
  private colorIndex = 0;

  constructor(readonly room: Party.Room) {}

  private assignUser(id: string): UserInfo {
    const color = CURSOR_COLORS[this.colorIndex % CURSOR_COLORS.length];
    this.colorIndex++;
    const info: UserInfo = { color, name: randomName() };
    this.users.set(id, info);
    return info;
  }

  private broadcastUserCount() {
    const count = [...this.room.getConnections()].length;
    const msg = JSON.stringify({ type: 'users', count });
    for (const conn of this.room.getConnections()) {
      conn.send(msg);
    }
  }

  async loadCells(): Promise<Record<string, string>> {
    const all = await this.room.storage.list<string>({ prefix: CELL_PREFIX });
    const cells: Record<string, string> = {};
    for (const [key, val] of all) {
      cells[key.slice(CELL_PREFIX.length)] = val;
    }
    return cells;
  }

  async applyAndSave(changes: CellChange[]): Promise<void> {
    const puts = new Map<string, string>();
    const deletes: string[] = [];
    for (const c of changes) {
      const key = `${CELL_PREFIX}${c.row},${c.col}`;
      if (c.char === ' ') deletes.push(key);
      else puts.set(key, c.char);
    }
    if (puts.size > 0) await this.room.storage.put(Object.fromEntries(puts));
    if (deletes.length > 0) await this.room.storage.delete(deletes);
  }

  async onConnect(conn: Party.Connection) {
    this.assignUser(conn.id);

    const cells = await this.loadCells();
    conn.send(JSON.stringify({ type: 'snapshot', cells }));

    this.broadcastUserCount();
  }

  onClose(conn: Party.Connection) {
    this.users.delete(conn.id);

    const leaveMsg = JSON.stringify({ type: 'cursor_leave', id: conn.id });
    for (const c of this.room.getConnections()) {
      if (c.id !== conn.id) c.send(leaveMsg);
    }

    this.broadcastUserCount();
  }

  async onMessage(message: string, sender: Party.Connection) {
    let parsed: ClientMessage;
    try {
      parsed = JSON.parse(message);
    } catch {
      return;
    }

    if (parsed.type === 'cursor') {
      const info = this.users.get(sender.id) ?? { color: '#888', name: 'Anon' };
      const msg = JSON.stringify({
        type: 'cursor',
        id: sender.id,
        name: info.name,
        row: parsed.row,
        col: parsed.col,
        color: info.color,
      });
      for (const conn of this.room.getConnections()) {
        if (conn.id !== sender.id) conn.send(msg);
      }
      return;
    }

    if (parsed.type === 'delta' && Array.isArray(parsed.changes)) {
      await this.applyAndSave(parsed.changes);

      const msg = JSON.stringify({ type: 'delta', changes: parsed.changes });
      for (const conn of this.room.getConnections()) {
        if (conn.id !== sender.id) conn.send(msg);
      }
    }
  }
}

CanvasServer satisfies Party.Worker;
