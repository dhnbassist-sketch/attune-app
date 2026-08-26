import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { installCatalogAttunements } from '../dist-electron/catalog.js';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const catalogRoot = join(root, '..', 'attunements');

test('catalog installer installs managed packages and preserves unmarked custom copies', async () => {
  const destination = await mkdtemp(join(tmpdir(), 'attune-catalog-'));
  try {
    installCatalogAttunements(catalogRoot, destination);
    const marker = JSON.parse(await readFile(
      join(destination, 'codex-kanban', '.attune-package.json'),
      'utf8',
    ));
    assert.equal(marker.id, 'codex-kanban');
    assert.equal(marker.version, '1.0.0');

    const customManifest = join(destination, 'blue-messages', 'manifest.json');
    await rm(join(destination, 'blue-messages', '.attune-package.json'));
    await writeFile(customManifest, '{"name":"My custom blue"}\n');
    installCatalogAttunements(catalogRoot, destination);
    assert.equal(await readFile(customManifest, 'utf8'), '{"name":"My custom blue"}\n');
  } finally {
    await rm(destination, { recursive: true, force: true });
  }
});

test('catalog installer can install Codex Kanban and Chat Canvas attunements without removing existing workspaces', async () => {
  const destination = await mkdtemp(join(tmpdir(), 'attune-catalog-'));
  try {
    const existingWorkspace = join(destination, 'existing-user-attunement');
    await mkdir(existingWorkspace);
    await writeFile(join(existingWorkspace, 'manifest.json'), '{"name":"Existing user attunement"}\n');

    installCatalogAttunements(catalogRoot, destination, [
      'codex-kanban',
      'codex-kanban-manual',
      'codex-multi-chat',
    ]);

    assert.deepEqual(
      (await readdir(destination)).sort(),
      ['codex-kanban', 'codex-kanban-manual', 'codex-multi-chat', 'existing-user-attunement'],
    );
    const marker = JSON.parse(await readFile(
      join(destination, 'codex-kanban', '.attune-package.json'),
      'utf8',
    ));
    assert.equal(marker.id, 'codex-kanban');
    assert.equal(marker.version, '1.0.0');
    const manualMarker = JSON.parse(await readFile(
      join(destination, 'codex-kanban-manual', '.attune-package.json'),
      'utf8',
    ));
    assert.equal(manualMarker.id, 'codex-kanban-manual');
    assert.equal(manualMarker.version, '1.0.1');
    const canvasMarker = JSON.parse(await readFile(
      join(destination, 'codex-multi-chat', '.attune-package.json'),
      'utf8',
    ));
    assert.equal(canvasMarker.id, 'codex-multi-chat');
    assert.equal(canvasMarker.version, '1.0.1');
    assert.equal(
      await readFile(join(existingWorkspace, 'manifest.json'), 'utf8'),
      '{"name":"Existing user attunement"}\n',
    );
  } finally {
    await rm(destination, { recursive: true, force: true });
  }
});
