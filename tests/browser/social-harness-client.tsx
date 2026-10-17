// Test-only standalone React boundary. Never imported by an application route.
import { createRoot } from 'react-dom/client';
import { Connections } from '../../src/features/connections/connections';
import type { ConnectionsView } from '../../src/features/connections/model';
const initial=(window as unknown as {socialFixture:ConnectionsView}).socialFixture;
createRoot(document.getElementById('root')!).render(<Connections initial={initial}/>);
