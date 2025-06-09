import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import type { Pool } from 'mysql2/promise';
import { repository, transaction } from '../src';
import { createTestPool, Post, setupDatabase, teardownDatabase, User } from './setup';

let pool: Pool;

beforeAll(async () => {
    pool = createTestPool();
    await setupDatabase(pool);
});

afterAll(async () => {
    await teardownDatabase(pool);
    await pool.end();
});

describe('transaction', () => {
    it('should commit a transaction successfully', async () => {
        const initialUserRepo = repository(pool, User);
        const initialCount = (await initialUserRepo.find({})).length;

        await transaction(async (connection) => {
            const userRepo = repository(connection, User);
            const postRepo = repository(connection, Post);

            const user = (await userRepo.create({ name: 'Trudy', email: 'trudy@example.com' })) as User;
            expect(user.id).toBeDefined();

            const post = (await postRepo.create({ title: 'Trudy\'s Post', userId: user.id })) as Post;
            expect(post.id).toBeDefined();
        }, pool);

        const finalCount = (await initialUserRepo.find({})).length;
        expect(finalCount).toBe(initialCount + 1);

        const newUser = await initialUserRepo.findOne({ name: 'Trudy' }, { relations: ['posts'] });
        expect(newUser).toBeDefined();
        expect(newUser!.posts).toHaveLength(1);
        expect(newUser!.posts[0]!.title).toBe('Trudy\'s Post');
    });

    it('should rollback a transaction on error', async () => {
        const initialUserRepo = repository(pool, User);
        const initialCount = (await initialUserRepo.find({})).length;

        try {
            await transaction(async (connection) => {
                const userRepo = repository(connection, User);
                await userRepo.create({ name: 'FailedUser', email: 'fail@example.com' });

                // This will fail due to a non-existent column, triggering a rollback
                await connection.query('INSERT INTO non_existent_table (col) VALUES (1)');
            }, pool);
        } catch (error) {
            // Expected error
        }

        const finalCount = (await initialUserRepo.find({})).length;
        expect(finalCount).toBe(initialCount);

        const failedUser = await initialUserRepo.findOne({ name: 'FailedUser' });
        expect(failedUser).toBeNull();
    });
});
