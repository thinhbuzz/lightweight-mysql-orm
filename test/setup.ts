import { createPool, type Pool } from 'mysql2/promise';
import { AfterLoad, Column, Entity, ManyToOne, OneToMany, setOptions } from '../src';

// --- ENTITY DEFINITIONS ---
export const testTablePrefix = 'test_';

// Using classes for test entities allows metadata to be attached.

@Entity({ tableName: testTablePrefix + 'users' })
export class User {
    @Column({ primary: true, type: 'number' })
    id!: number;

    @Column()
    name!: string;

    @Column({ hidden: true })
    email!: string;

    @Column({ name: 'created_at', type: 'date' })
    createdAt!: Date;

    @Column({ name: 'deleted_at', type: 'date', softDelete: true, hidden: true })
    deletedAt?: Date;

    @OneToMany(() => Post, { inverseSide: 'user' })
    posts!: Post[];

    // For testing hooks
    postCount?: number;

    @AfterLoad()
    calculatePostCount() {
        if (this.posts) {
            this.postCount = this.posts.length;
        }
    }
}

@Entity({ tableName: testTablePrefix + 'posts' })
export class Post {
    @Column({ primary: true, type: 'number' })
    id!: number;

    @Column()
    title!: string;

    @Column({ name: 'user_id', type: 'number' })
    userId!: number;

    @ManyToOne(() => User, { foreignKey: 'user_id' })
    user!: User;

    @OneToMany(() => Comment, { inverseSide: 'post' })
    comments!: Comment[];
}

@Entity({ tableName: testTablePrefix + 'comments' })
export class Comment {
    @Column({ primary: true, type: 'number' })
    id!: number;

    @Column()
    content!: string;

    @Column({ name: 'post_id', type: 'number' })
    postId!: number;

    @ManyToOne(() => Post, { foreignKey: 'post_id' })
    post!: Post;
}

// --- DATABASE SETUP ---

export function createTestPool() {
    // For local testing, expects a local MySQL server with a 'test_db' database.
    // Use environment variables for CI/CD environments.
    return createPool({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'test_db',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
    });
}

export async function setupDatabase(pool: Pool) {
    setOptions({ printQuery: true });
    // Create tables
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS ${testTablePrefix}users
        (
            id         INT AUTO_INCREMENT PRIMARY KEY,
            name       VARCHAR(255) NOT NULL,
            email      VARCHAR(255) NOT NULL UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMP    NULL
        );
    `);
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS ${testTablePrefix}posts
        (
            id      INT AUTO_INCREMENT PRIMARY KEY,
            title   VARCHAR(255) NOT NULL,
            user_id INT,
            FOREIGN KEY (user_id) REFERENCES ${testTablePrefix}users (id) ON DELETE CASCADE
        );
    `);
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS ${testTablePrefix}comments
        (
            id      INT AUTO_INCREMENT PRIMARY KEY,
            content TEXT NOT NULL,
            post_id INT,
            FOREIGN KEY (post_id) REFERENCES ${testTablePrefix}posts (id) ON DELETE CASCADE
        );
    `);

    // Clear existing data
    await pool.execute('SET FOREIGN_KEY_CHECKS = 0;');
    await pool.execute(`TRUNCATE TABLE ${testTablePrefix}comments;`);
    await pool.execute(`TRUNCATE TABLE ${testTablePrefix}posts;`);
    await pool.execute(`TRUNCATE TABLE ${testTablePrefix}users;`);
    await pool.execute('SET FOREIGN_KEY_CHECKS = 1;');
}

export async function seedDatabase(pool: Pool) {
    // Seed users
    await pool.execute(`INSERT INTO ${testTablePrefix}users (id, name, email) VALUES (1, 'Alice', 'alice@example.com');`);
    await pool.execute(`INSERT INTO ${testTablePrefix}users (id, name, email) VALUES (2, 'Bob', 'bob@example.com');`);
    // A soft-deleted user
    await pool.execute(`INSERT INTO ${testTablePrefix}users (id, name, email, deleted_at) VALUES (3, 'Charlie', 'charlie@example.com', NOW());`);

    // Seed posts
    await pool.execute(`INSERT INTO ${testTablePrefix}posts (id, title, user_id) VALUES (1, 'Alices Post 1', 1);`);
    await pool.execute(`INSERT INTO ${testTablePrefix}posts (id, title, user_id) VALUES (2, 'Alices Post 2', 1);`);
    await pool.execute(`INSERT INTO ${testTablePrefix}posts (id, title, user_id) VALUES (3, 'Bobs Post 1', 2);`);

    // Seed comments
    await pool.execute(`INSERT INTO ${testTablePrefix}comments (id, content, post_id) VALUES (1, 'Comment on Alices Post 1', 1);`);
    await pool.execute(`INSERT INTO ${testTablePrefix}comments (id, content, post_id) VALUES (2, 'Another comment on Alices Post 1', 1);`);
    await pool.execute(`INSERT INTO ${testTablePrefix}comments (id, content, post_id) VALUES (3, 'Comment on Bobs Post 1', 3);`);
}

export async function teardownDatabase(pool: Pool) {
    await pool.execute(`DROP TABLE IF EXISTS ${testTablePrefix}comments;`);
    await pool.execute(`DROP TABLE IF EXISTS ${testTablePrefix}posts;`);
    await pool.execute(`DROP TABLE IF EXISTS ${testTablePrefix}users;`);
} 
