import { beforeAll, afterAll, describe, it, expect } from 'bun:test';
import type { Pool } from 'mysql2/promise';
import { repository } from '../src';
import { createTestPool, setupDatabase, teardownDatabase, seedDatabase, User, Post, Comment } from './setup';

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

describe('Relation Loading', () => {
    it('should load a simple one-to-many relation', async () => {
        const user = await userRepo.findOne({ id: 1 }, { relations: ['posts'] });
        expect(user).toBeDefined();
        expect(user.posts).toBeInstanceOf(Array);
        expect(user.posts.length).toBe(2);
        expect(user.posts[0]).toBeInstanceOf(Post);
    });

    it('should trigger the @AfterLoad hook after loading relations', async () => {
        const user = await userRepo.findOne({ id: 1 }, { relations: ['posts'] });
        expect(user.postCount).toBe(2);
    });

    it('should load nested relations using dot notation', async () => {
        const user = await userRepo.findOne({ id: 1 }, { relations: ['posts.comments'] });
        expect(user.posts).toBeDefined();
        expect(user.posts.length).toBe(2);

        const post1 = user.posts.find((p: any) => p.id === 1);
        expect(post1.comments).toBeInstanceOf(Array);
        expect(post1.comments.length).toBe(2);
        expect(post1.comments[0]).toBeInstanceOf(Comment);
        expect(post1.comments[0].content).toBe('Comment on Alices Post 1');
    });

    it('should load relations with complex object notation', async () => {
        const user = await userRepo.findOne({ id: 1 }, {
            relations: [{
                posts: {
                    orderBy: { id: 'DESC' },
                    limit: 1
                }
            }]
        });

        expect(user.posts).toBeDefined();
        expect(user.posts.length).toBe(1);
        expect(user.posts[0].id).toBe(2); // Should be the last post due to ordering
    });

    it('should load deeply nested relations with complex object notation', async () => {
        const user = await userRepo.findOne({ id: 1 }, {
            relations: [{
                posts: {
                    where: { id: 1 },
                    relations: [{
                        comments: {
                            orderBy: { id: 'DESC' }
                        }
                    }]
                }
            }]
        });

        expect(user.posts).toBeDefined();
        expect(user.posts.length).toBe(1);

        const post = user.posts[0];
        expect(post.comments).toBeDefined();
        expect(post.comments.length).toBe(2);
        expect(post.comments[0].id).toBe(2); // The last comment
    });

    it('should return an empty array for relations with no results', async () => {
        // Bob has a post but that post has no comments
        const user = await userRepo.findOne({ id: 2 }, { relations: ['posts.comments'] });

        expect(user).toBeDefined();
        expect(user.posts).toBeInstanceOf(Array);
        expect(user.posts.length).toBe(1);

        const post = user.posts[0];
        expect(post.comments).toBeInstanceOf(Array);
        expect(post.comments.length).toBe(1);
    });
}); 
