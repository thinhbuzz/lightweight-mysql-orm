import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import type { Pool } from 'mysql2/promise';
import { ColumnNotFoundError, repository, SoftDeleteNotSupportedError } from '../src';
import { createTestPool, Post, seedDatabase, setupDatabase, teardownDatabase, User } from './setup';

let pool: Pool;
let userRepo: any;
let postRepo: any; // Post entity does not have soft delete

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

describe('Custom Error Handling', () => {
    it('should throw ColumnNotFoundError for an invalid column in `select`', async () => {
        try {
            await userRepo.find({}, { select: ['id', 'nonExistentColumn'] });
            // Should not reach here
            expect(true).toBe(false);
        } catch (e: any) {
            expect(e).toBeInstanceOf(ColumnNotFoundError);
            expect(e.message).toBe('Column "nonExistentColumn" not found in entity "User".');
        }
    });

    it('should throw ColumnNotFoundError for an invalid column in `where`', async () => {
        try {
            await userRepo.find({ nonExistentColumn: 'someValue' });
            expect(true).toBe(false);
        } catch (e: any) {
            expect(e).toBeInstanceOf(ColumnNotFoundError);
            expect(e.message).toBe('Column "nonExistentColumn" not found in entity "User".');
        }
    });

    it('should throw ColumnNotFoundError for an invalid column in `orderBy`', async () => {
        try {
            await userRepo.find({}, { orderBy: { nonExistentColumn: 'ASC' } });
            expect(true).toBe(false);
        } catch (e: any) {
            expect(e).toBeInstanceOf(ColumnNotFoundError);
            expect(e.message).toBe('Column "nonExistentColumn" not found in entity "User".');
        }
    });

    it('should throw ColumnNotFoundError for an invalid column in a relation query', async () => {
        try {
            await userRepo.find({}, {
                relations: [
                    {
                        posts: {
                            select: ['id', 'invalidPostColumn'],
                        },
                    },
                ],
            });
            expect(true).toBe(false);
        } catch (e: any) {
            expect(e).toBeInstanceOf(ColumnNotFoundError);
            expect(e.message).toBe('Column "invalidPostColumn" not found in entity "Post".');
        }
    });

    it('should throw SoftDeleteNotSupportedError when calling `restore` on an unsupported entity', async () => {
        try {
            await postRepo.restore({ id: 1 });
            expect(true).toBe(false);
        } catch (e: any) {
            expect(e).toBeInstanceOf(SoftDeleteNotSupportedError);
            expect(e.message).toBe('Soft delete is not supported for entity "Post".');
        }
    });
}); 
