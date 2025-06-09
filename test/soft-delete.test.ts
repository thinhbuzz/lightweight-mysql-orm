import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import type { Pool } from 'mysql2/promise';
import { repository } from '../src';
import { createTestPool, seedDatabase, setupDatabase, teardownDatabase, User } from './setup';

let pool: Pool;
let userRepo: any;

beforeAll(async () => {
    pool = createTestPool();
    await setupDatabase(pool);
    await seedDatabase(pool);
    userRepo = repository(pool, User);
});

afterAll(async () => {
    await teardownDatabase(pool);
    await pool.end();
});

describe('Soft Delete Functionality', () => {
    it('should not return soft-deleted records by default', async () => {
        // User with id 3 (Charlie) is soft-deleted in the seed data
        const user = await userRepo.findOne({ id: 3 });
        expect(user).toBeNull();
    });

    it('should return soft-deleted records when using withDeleted: true', async () => {
        const user = await userRepo.findOne({ id: 3 }, { withDeleted: true });
        expect(user).toBeDefined();
        expect(user.id).toBe(3);
        expect(user.name).toBe('Charlie');
        expect(user.deletedAt).toBeInstanceOf(Date);
    });

    it('should soft-delete an entity', async () => {
        const bob = await userRepo.findOne({ id: 2 });
        expect(bob).toBeDefined();

        await userRepo.delete(bob);

        const deletedBob = await userRepo.findOne({ id: 2 });
        expect(deletedBob).toBeNull();

        const deletedBobWithFlag = await userRepo.findOne({ id: 2 }, { withDeleted: true });
        expect(deletedBobWithFlag).toBeDefined();
        expect(deletedBobWithFlag.deletedAt).toBeInstanceOf(Date);
    });

    it('should restore a soft-deleted entity', async () => {
        // First, verify Charlie is soft-deleted
        const charlie = await userRepo.findOne({ id: 3 }, { withDeleted: true });
        expect(charlie).toBeDefined();
        expect(charlie.deletedAt).toBeInstanceOf(Date);

        // Restore Charlie
        await userRepo.restore(charlie);

        // Now, find Charlie without the withDeleted flag
        const restoredCharlie = await userRepo.findOne({ id: 3 });
        expect(restoredCharlie).toBeDefined();
        expect(restoredCharlie.id).toBe(3);
        expect(restoredCharlie.deletedAt).toBeNull();
    });

    it('should restore soft-deleted records with a where clause', async () => {
        // Soft-delete Alice for this test
        await userRepo.delete({ id: 1 });
        const deletedAlice = await userRepo.findOne({ id: 1 });
        expect(deletedAlice).toBeNull();

        // Restore using a where clause
        await userRepo.restore({ id: 1 });
        const restoredAlice = await userRepo.findOne({ id: 1 });
        expect(restoredAlice).toBeDefined();
        expect(restoredAlice.name).toBe('Alice');
        expect(restoredAlice.deletedAt).toBeNull();
    });
}); 
