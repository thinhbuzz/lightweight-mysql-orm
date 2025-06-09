import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import type { Pool } from 'mysql2/promise';
import { BaseRepository, repository } from '../src';
import { createTestPool, Post, seedDatabase, setupDatabase, teardownDatabase, User } from './setup';

let pool: Pool;
let userRepo: BaseRepository<User>;
let postRepo: BaseRepository<Post>;

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

describe('CRUD Operations', () => {
    it('should create a new entity', async () => {
        const newUser = (await userRepo.create({
            name: 'David',
            email: 'david@example.com',
        })) as User;
        expect(newUser).toBeInstanceOf(User);
        expect(newUser.id).toBeDefined();
        expect(newUser.name).toBe('David');
    });

    it('should find entities with a where clause', async () => {
        const users = await userRepo.find({ name: 'Alice' });
        expect(users.length).toBe(1);
        expect(users[0]!.name).toBe('Alice');
    });

    it('should find a single entity with findOne', async () => {
        const user = (await userRepo.findOne({ name: 'Bob' })) as User;
        expect(user).toBeInstanceOf(User);
        expect(user.id).toBe(2);
        expect(user.name).toBe('Bob');
    });

    it('should return null with findOne if no entity is found', async () => {
        const user = await userRepo.findOne({ name: 'Eve' });
        expect(user).toBeNull();
    });

    it('should update an entity by its primary key', async () => {
        const alice = (await userRepo.findOne({ id: 1 })) as User;
        expect(alice).toBeDefined();

        await userRepo.update(alice, { name: 'Alice Smith' });

        const updatedAlice = (await userRepo.findOne({ id: 1 })) as User;
        expect(updatedAlice.name).toBe('Alice Smith');
    });

    it('should update entities matching a where clause', async () => {
        await postRepo.update({ userId: 1 }, { title: 'Updated Alice Post' });
        const posts = (await postRepo.find({ userId: 1 }));
        expect(posts.length).toBe(2);
        expect(posts[0]!.title).toBe('Updated Alice Post');
        expect(posts[1]!.title).toBe('Updated Alice Post');
    });

    it('should delete an entity instance', async () => {
        const newPost = (await postRepo.create({ title: 'To Be Deleted', userId: 2 })) as Post;
        expect(newPost).toBeDefined();

        await postRepo.delete(newPost);

        const deletedPost = await postRepo.findOne({ id: newPost.id });
        expect(deletedPost).toBeNull();
    });

    it('should delete entities matching a where clause', async () => {
        await postRepo.create({ title: 'Another To Be Deleted', userId: 2 });
        const countBefore = await postRepo.find({ userId: 2 });
        expect(countBefore.length).toBeGreaterThan(0);

        await postRepo.delete({ title: { $like: '%To Be Deleted' } });

        const posts = await postRepo.find({ title: { $like: '%To Be Deleted' } });
        expect(posts.length).toBe(0);
    });
}); 
