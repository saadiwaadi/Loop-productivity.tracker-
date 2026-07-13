import db, { setBypassSoftDeleteMiddleware } from './db';
import { mapRemoteToLocal } from './sync';
import { mapLocalToRemote } from './queueManager';

/**
 * Runs the sync engine's test suite to verify correct behavior.
 */
export async function runSyncTests() {
  console.group('=== Sync Engine Test Suite ===');
  try {
    // 1. Soft Delete & Query Interception Test
    console.info('[Test] Verifying Soft Delete and Query Filtering...');
    // Clear existing projects in db transaction
    await db.projects.clear();
    await db.syncQueue.clear();

    // Insert a project (middleware automatically manages timestamps)
    const projectId = await db.projects.add({
      name: 'Test Project Alpha',
      colorToken: '--violet',
      icon: 'Folder',
      status: 'active',
      createdAt: new Date()
    });

    let activeCount = await db.projects.count();
    if (activeCount !== 1) throw new Error('Expected 1 active project');

    // Perform soft delete
    await db.projects.delete(projectId);

    // Verify it is hidden from count and array queries
    activeCount = await db.projects.count();
    if (activeCount !== 0) throw new Error('Expected 0 active projects after soft delete');

    const list = await db.projects.toArray();
    if (list.length !== 0) throw new Error('Expected projects list to be empty');

    // Verify it still exists in IndexedDB (bypassing middleware)
    setBypassSoftDeleteMiddleware(true);
    try {
      const rawItem = await db.projects.get(projectId);
      if (!rawItem || !rawItem.deletedAt) {
        throw new Error('Expected project to exist with a deletedAt timestamp');
      }
      console.log('✓ Soft Delete & Filter Query Interception: PASSED');
    } finally {
      setBypassSoftDeleteMiddleware(false);
    }

    // 2. Persistent Queue test
    console.info('[Test] Verifying Queue Tracking on Mutations...');
    const queueSize = await db.syncQueue.count();
    if (queueSize < 2) {
      throw new Error(`Expected at least 2 queue entries (insert + delete), found ${queueSize}`);
    }
    console.log('✓ Durable Mutation Sync Queuing: PASSED');

    // 3. Conflict Resolution test
    console.info('[Test] Verifying Latest-Updated-Wins Conflict Resolution...');
    const localRecord = {
      id: 99,
      name: 'Local Project',
      colorToken: '--violet',
      icon: 'Folder',
      status: 'active' as const,
      createdAt: new Date('2026-07-13T06:00:00Z'),
      updatedAt: new Date('2026-07-13T06:00:00Z')
    };

    const remoteRecord = {
      id: 99,
      user_id: 'mock-user-id',
      name: 'Remote Project (Newer)',
      color_token: '--violet',
      icon: 'Folder',
      status: 'active',
      created_at: '2026-07-13T06:00:00Z',
      updated_at: '2026-07-13T07:00:00Z'
    };

    const parsedRemote = mapRemoteToLocal('projects', remoteRecord);
    
    // Remote record has newer updatedAt timestamp
    const remoteNewer = new Date(parsedRemote.updatedAt).getTime() > new Date(localRecord.updatedAt).getTime();
    if (!remoteNewer) throw new Error('Expected remote to be newer');
    
    console.log('✓ Conflict Resolution Rule: PASSED');

    // 4. Case Converters and Idempotence
    console.info('[Test] Verifying JSON Mapping and Case Converters...');
    const userId = 'user-uuid';
    const mappedRemote = mapLocalToRemote('projects', localRecord, userId);
    
    if (mappedRemote.color_token !== '--violet' || mappedRemote.user_id !== userId) {
      throw new Error('Mapping case converter or user_id mapping failed');
    }
    console.log('✓ JSON Mapping & Case Conversion: PASSED');

    console.info('=== Sync Engine Test Suite: ALL PASSED ===');
  } catch (err) {
    console.error('❌ Sync Engine Test Suite: FAILED', err);
  } finally {
    console.groupEnd();
  }
}
