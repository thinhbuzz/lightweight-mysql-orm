import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import type { Pool } from 'mysql2/promise';
import { repository } from '../src';
import { createTestPool, Post, seedDatabase, setupDatabase, teardownDatabase, User } from './setup';

let pool: Pool;
let userRepo: any;
let postRepo: any;

beforeAll(async () => {
    pool = createTestPool();
    await setupDatabase(pool);
    await seedDatabase(pool);
    userRepo = repository(pool, User);
    postRepo = repository(pool, Post);
});

afterAll(async () => {
    await teardownDatabase(pool);
    await pool.end();
});

describe('Advanced Query Features', () => {
    it('should select specific columns', async () => {
        const user = await userRepo.findOne({ id: 1 }, { select: ['id', 'name'] });
        expect(user).toBeDefined();
        expect(user.id).toBe(1);
        expect(user.name).toBe('Alice');
        expect(user.email).toBeUndefined(); // email was not selected
        expect(user.createdAt).toBeUndefined(); // createdAt was not selected
    });

    it('should order results with orderBy', async () => {
        const users = await userRepo.find({}, { orderBy: { name: 'DESC' } });
        expect(users.length).toBeGreaterThan(1);
        // Charlie is soft-deleted, so Bob should be first
        expect(users[0].name).toBe('Bob');
        expect(users[1].name).toBe('Alice');
    });

    it('should limit the number of results', async () => {
        const users = await userRepo.find({}, { limit: 1, orderBy: { name: 'ASC' } });
        expect(users.length).toBe(1);
        expect(users[0].name).toBe('Alice');
    });

    it('should offset the results for pagination', async () => {
        const users = await userRepo.find({}, { limit: 1, offset: 1, orderBy: { name: 'ASC' } });
        expect(users.length).toBe(1);
        expect(users[0].name).toBe('Bob');
    });

    describe('Query Operators', () => {
        it('should handle the $in operator', async () => {
            const users = await userRepo.find({ id: { $in: [1, 2] } });
            expect(users.length).toBe(2);
        });

        it('should handle the $like operator', async () => {
            const users = await userRepo.find({ name: { $like: 'Ali%' } });
            expect(users.length).toBe(1);
            expect(users[0].name).toBe('Alice');
        });

        it('should handle the $gt (greater than) operator', async () => {
            const posts = await postRepo.find({ id: { $gt: 2 } });
            expect(posts.length).toBe(1);
            expect(posts[0].id).toBe(3);
        });

        it('should handle the $ne (not equal) operator', async () => {
            const users = await userRepo.find({ name: { $ne: 'Alice' } });
            // Should find Bob, but not Charlie (soft-deleted) or Alice
            expect(users.length).toBe(1);
            expect(users[0].name).toBe('Bob');
        });
    });
}); 
