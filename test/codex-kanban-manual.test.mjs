import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const attunementsRoot = join(root, '..', 'attunements', 'attunements');
const manualRoot = join(attunementsRoot, 'codex-kanban-manual');
const originalRoot = join(attunementsRoot, 'codex-kanban');

test('Manual Chat Kanban declares separate Codex bindings and assets', async () => {
  const manifest = JSON.parse(await readFile(join(manualRoot, 'manifest.json'), 'utf8'));
  const target = manifest.targets.Codex;

  assert.equal(manifest.manifestVersion, 2);
  assert.equal(manifest.name, 'Codex: Manual Chat Kanban');
  assert.deepEqual(target.styles, ['apps/codex-kanban-manual.css']);
  assert.equal(target.script, 'apps/codex-kanban-manual.js');
  assert.equal(target.bindings.main.role, 'codex.primaryChat');
  assert.equal(target.bindings.main.required, true);
  assert.equal(target.bindings.sidebar.role, 'codex.sidebar');
  assert.equal(target.bindings.appShell.role, 'codex.appShell');
  assert.equal(target.bindings.sidebarThreads.role, 'codex.sidebarThreads');
});

test('Manual Chat Kanban keeps auto Codex status while applying local placements', async () => {
  const source = await readFile(join(manualRoot, 'apps', 'codex-kanban-manual.js'), 'utf8');

  assert.match(source, /const MANUAL_PLACEMENT_KEY = 'attune-codex-kanban-manual-placements:v1'/);
  assert.match(source, /JSON\.parse\(localStorage\.getItem\(MANUAL_PLACEMENT_KEY\)/);
  assert.match(source, /localStorage\.setItem\(MANUAL_PLACEMENT_KEY/);
  assert.match(source, /readManualPlacements\(\)/);
  assert.match(source, /manualPlacements\.get\(thread\.id\)\?\.column \|\| autoStageFor\(thread\)/);
  assert.match(source, /autoStageLabelFor\(thread\)/);
  assert.match(source, /status\.textContent = `Codex: \$\{autoStageLabelFor\(thread\)\}`/);
  assert.match(source, /thread\.waiting === true/);
  assert.match(source, /isWaitingStatus\(thread\.status\)/);
  assert.match(source, /isRunningStatus\(thread\.status\)/);
  assert.match(source, /thread\.hasUnreadTurn === true/);
});

test('Manual Chat Kanban supports drag drop movement and reorder without opening chats', async () => {
  const source = await readFile(join(manualRoot, 'apps', 'codex-kanban-manual.js'), 'utf8');

  assert.match(source, /card\.draggable = true/);
  assert.match(source, /addEventListener\('dragstart'/);
  assert.match(source, /addEventListener\('dragend'/);
  assert.match(source, /addEventListener\('dragover'/);
  assert.match(source, /addEventListener\('drop'/);
  assert.match(source, /dropIndexFor\(body, event\.clientY\)/);
  assert.match(source, /saveManualDrop\(threadId, stageId/);
  assert.match(source, /clickSuppressedUntil/);
  assert.match(source, /event\.preventDefault\(\);\s+event\.stopPropagation\(\);\s+return;/);
  assert.doesNotMatch(source, /thread\/status\/update|thread\/update|thread\/set-status/);
});

test('Manual Chat Kanban uses isolated DOM ids, classes, and storage keys', async () => {
  const source = await readFile(join(manualRoot, 'apps', 'codex-kanban-manual.js'), 'utf8');
  const styles = await readFile(join(manualRoot, 'apps', 'codex-kanban-manual.css'), 'utf8');

  assert.match(source, /__attuneCodexKanbanManualCleanup/);
  assert.match(source, /attune-codex-kanban-manual/);
  assert.match(source, /attune-kanban-manual-card/);
  assert.match(source, /Manual Kanban \(⌘⇧M\)/);
  assert.match(source, /toLowerCase\(\) !== 'm'/);
  assert.match(styles, /#attune-codex-kanban-manual/);
  assert.match(styles, /\.attune-kanban-manual-status-badge/);
  assert.match(styles, /\[data-drop-target="true"\]/);
  assert.doesNotMatch(source, /__attuneCodexKanbanCleanup\?\./);
  assert.doesNotMatch(source, /id = 'attune-codex-kanban'/);
  assert.doesNotMatch(source, /Kanban \(⌘⇧K\)/);
  assert.doesNotMatch(styles, /#attune-codex-kanban\s/);
});

test('Original Chat Kanban remains automatic and non-draggable', async () => {
  const source = await readFile(join(originalRoot, 'apps', 'codex-kanban.js'), 'utf8');
  const styles = await readFile(join(originalRoot, 'apps', 'codex-kanban.css'), 'utf8');

  assert.match(source, /window\.__attuneCodexKanbanCleanup/);
  assert.match(source, /const stageFor = \(thread\) =>/);
  assert.doesNotMatch(source, /MANUAL_PLACEMENT_KEY/);
  assert.doesNotMatch(source, /addEventListener\('dragstart'/);
  assert.doesNotMatch(source, /card\.draggable = true/);
  assert.doesNotMatch(styles, /attune-kanban-manual/);
});
