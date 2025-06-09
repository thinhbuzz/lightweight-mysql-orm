# Lightweight MySQL ORM

A TypeScript-first, decorator-based ORM for MySQL designed for high performance, type safety, and a great developer experience. It features built-in support for relationships, soft deletes, transactions, and a powerful, modern query API.

---

## 🤔 Why This ORM?

In a world of heavy, complex ORMs, this library provides a refreshing alternative by focusing on three key principles:
-   **Performance**: Blazing fast queries with an intelligent metadata caching system. No unnecessary overhead.
-   **Type Safety**: A deep integration with TypeScript to catch errors at compile time, not runtime.
-   **Simplicity**: An intuitive, decorator-based API that gets out of your way and lets you build.

If you love the simplicity of raw SQL but want the safety and power of a modern ORM, you're in the right place.

---

## ✨ Core Features

-   **🎯 TypeScript-First**: End-to-end type safety for entities, queries, and relations.
-   **🚀 High Performance**: Aggressive metadata caching for millisecond-level query performance.
-   **🔗 Advanced Relations**: Load deeply nested relations with dot notation (`'posts.comments'`) or complex objects with conditions.
-   **📊 Powerful Queries**: Full support for `select`, `orderBy`, `where`, `limit`, and `offset` on both main queries and relations.
-   **🏷️ Decorator-Based**: Clean, intuitive, and modern entity definitions.
-   **🗑️ Soft Deletes**: Built-in, automated soft delete and restore functionality.
-   **💾 ACID Transactions**: Simple, promise-based transaction management for data integrity.
-   **🔍 Advanced Operators**: A rich set of query operators (`$in`, `$like`, `$gt`, etc.).
-   **🐛 Custom Errors**: Descriptive, catchable error classes for robust error handling.

---

## 💾 Installation

```bash
# Bun
bun install lightweight-mysql-orm mysql2

# NPM
npm install lightweight-mysql-orm mysql2
```

---

## 🚀 Quick Start

#### 1. Define Your Entities

Define your database schema using simple decorators.

```typescript
// src/entities/User.ts
import { Entity, Column, OneToMany, AfterLoad } from 'lightweight-mysql-orm';
import { Post } from './Post';

@Entity({ tableName: 'users', softDelete: true })
export class User {
    @Column({ primary: true, type: 'number' })
    id: number;

    @Column()
    name: string;

    @Column({ hidden: true }) // Will be excluded from JSON serialization
    email: string;

    @OneToMany(() => Post, { inverseSide: 'user' })
    posts: Post[];
    
    // Example hook to add a computed property
    postCount: number;
    @AfterLoad()
    calculatePostCount() {
        if (this.posts) {
            this.postCount = this.posts.length;
        }
    }
}

// src/entities/Post.ts
import { Entity, Column, ManyToOne } from 'lightweight-mysql-orm';
import { User } from './User';

@Entity({ tableName: 'posts' })
export class Post {
    @Column({ primary: true, type: 'number' })
    id: number;

    @Column()
    title: string;

    @ManyToOne(() => User, { foreignKey: 'user_id' })
    user: User;
}
```

#### 2. Configure the Database

Create a connection pool. It's best to do this once and export it for use throughout your application.

```typescript
// src/db.ts
import { createPool } from 'lightweight-mysql-orm';

// It is highly recommended to use environment variables for configuration
export const pool = createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    database: process.env.DB_NAME || 'my_app',
    password: process.env.DB_PASSWORD,
    // Enable query logging for development
    debug: process.env.NODE_ENV !== 'production'
});
```

#### 3. Query Your Data

Use the `repository` to perform CRUD operations.

```typescript
import { repository } from 'lightweight-mysql-orm';
import { pool } from './db';
import { User } from './entities/User';
import { Post } from './entities/Post';

const userRepo = repository(pool, User);
const postRepo = repository(pool, Post);

async function main() {
    // 1. Create a new user
    const newUser = await userRepo.create({
        name: 'Alice',
        email: 'alice@example.com'
    });
    console.log('Created User:', newUser);

    // 2. Create posts for the user
    await postRepo.create({ title: 'My First Post', user: newUser });
    await postRepo.create({ title: 'TypeScript is Awesome', user: newUser });

    // 3. Find the user with their posts, selecting specific columns
    const users = await userRepo.find(
        { id: newUser.id }, // Where clause
        {
            select: ['id', 'name'],
            relations: [{
                posts: {
                    select: ['id', 'title'],
                    orderBy: { title: 'ASC' }
                }
            }]
        }
    );
    console.log('Found User with Posts:', JSON.stringify(users, null, 2));
    
    // 4. Soft-delete the user
    await userRepo.delete({ id: newUser.id });
    console.log(`User with ID ${newUser.id} soft-deleted.`);
    
    // 5. Verify the user is gone (without withDeleted)
    const found = await userRepo.findOne({ id: newUser.id });
    console.log('Found after delete:', found); // null

    await pool.end();
}

main().catch(console.error);
```

---

## 📚 API Reference

### Decorators

#### `@Entity(options)`
-   `tableName: string`: **Required**. The name of the database table.
-   `softDelete?: boolean`: Enables soft-delete functionality. Defaults to `false`.
-   `softDeleteColumn?: string`: The name of the timestamp column for soft deletes. Defaults to `'deleted_at'`.

#### `@Column(options)`
-   `name?: string`: Database column name. Defaults to the property name (e.g., `firstName` -> `first_name`).
-   `type?: 'string' | 'number' | 'boolean' | 'date' | 'json'`: The property's data type for correct mapping. Defaults to `'string'`.
-   `primary?: boolean`: Marks the column as the primary key. Required for `update` and `delete` on entity instances.
-   `hidden?: boolean`: Excludes the column from the default `toJSON()` serialization.
-   `softDelete?: boolean`: Marks this column as the soft delete flag. **Note**: The `@Entity` option is the preferred way to configure this.

#### Relationship Decorators
-   **`@OneToOne(target, options)`**
-   **`@OneToMany(target, options)`**
-   **`@ManyToOne(target, options)`**
-   **`@ManyToMany(target, options)`**

**Common Relation Options:**
-   `foreignKey?: string`: The foreign key on the owning side of the relation (e.g., `user_id` in the `Post` entity).
-   `inverseSide?: string`: **Required for `@OneToMany`**. The name of the property on the "many" side that maps back to this entity.
-   `joinTableName?: string`: **Required for `@ManyToMany`**. The name of the pivot/junction table.
-   `joinColumnName?: string`: For `@ManyToMany`, the foreign key in the pivot table that points to the current entity.
-   `inverseJoinColumnName?: string`: For `@ManyToMany`, the foreign key in the pivot table that points to the target entity.

---

### Repository Methods

The `BaseRepository` is the heart of the ORM. Get an instance via `repository(pool, EntityClass)`.

#### `find(where?, options?)` & `findOne(where?, options?)`
Finds multiple or a single record.

**Find Options:**
-   `select?: (keyof T)[]`: An array of property names to select. If omitted, all columns are selected.
-   `orderBy?: { [K in keyof T]?: 'ASC' | 'DESC' } | (keyof T)[]`: The order for the results.
-   `relations?: RelationSpec<T>[]`: An array specifying which relations to load.
-   `limit?: number`: Maximum number of records to return.
-   `offset?: number`: Number of records to skip (useful for pagination).
-   `withDeleted?: boolean`: Includes soft-deleted records in the results.

#### `create(entity)`
Creates a new record. Returns the complete entity from the database.

#### `update(entity | where, updates)`
Updates one or more records.
-   `update(user, { name: 'New Name' })`: Updates a specific entity instance by its primary key.
-   `update({ status: 'archived' }, { status: 'deleted' })`: Updates all records matching the `where` clause.

#### `delete(entity | where)`
Deletes a record. If soft-delete is enabled, it performs a soft delete. Otherwise, it's a hard delete.

#### `restore(entity | where)`
Restores one or more soft-deleted records. Throws an error if the entity does not support soft deletes.

#### `query(sql, params)`
Executes a raw SQL query and returns the results. Use this for complex queries that are beyond the ORM's capabilities.

---

## ☢️ Advanced Features

### Nested Relations

Load deeply nested data with a clean and powerful syntax.

**1. Dot Notation (Simple & Fast)**
Best for simple "load this, then that" scenarios.
```typescript
const users = await userRepo.find({}, {
    relations: ['posts.comments'] // Load users -> posts -> comments
});
```

**2. Object Notation (Powerful & Flexible)**
Required when you need to add `where`, `orderBy`, `select`, or `limit` to a relation.
```typescript
const users = await userRepo.find({}, {
    relations: [{
        posts: { // Load the 'posts' relation
            where: { published: true },
            orderBy: { createdAt: 'DESC' },
            select: ['id', 'title'],
            limit: 5,
            relations: [{ // You can nest further!
                comments: {
                    where: { isApproved: true }
                }
            }]
        }
    }]
});
```

### Query Operators

Use a rich set of operators in your `where` clauses for powerful filtering.

| Operator       | Example                                | Description                         |
| :------------- | :------------------------------------- | :---------------------------------- |
| **`$eq`**      | `{ name: { $eq: 'Jane' } }`            | Equal (this is the default)         |
| **`$ne`**      | `{ status: { $ne: 'archived' } }`      | Not equal                           |
| **`$gt`**      | `{ age: { $gt: 18 } }`                 | Greater than                        |
| **`$gte`**     | `{ age: { $gte: 21 } }`                | Greater than or equal               |
| **`$lt`**      | `{ price: { $lt: 99.99 } }`            | Less than                           |
| **`$lte`**     | `{ stock: { $lte: 10 } }`              | Less than or equal                  |
| **`$in`**      | `{ status: { $in: ['active', 'pending'] } }` | Value is in the array             |
| **`$like`**    | `{ name: { $like: 'Jane%' } }`         | `LIKE` operator (wildcard: `%`)   |
| **`$between`** | `{ logins: { $between: [5, 10] } }`    | `BETWEEN` two values (inclusive)    |
| **`$isNull`**  | `{ archivedAt: { $isNull: true } }`    | Value `IS NULL` or `IS NOT NULL`    |


### Transactions

For data integrity, wrap multiple database operations in a single atomic transaction.

```typescript
import { transaction } from 'lightweight-mysql-orm';

await transaction(pool, async (connection) => { // Pass the pool to start
    // From here, use the provided `connection` to get repositories
    const userRepo = repository(connection, User);
    const postRepo = repository(connection, Post);
    
    const user = await userRepo.create({ name: 'John', email: 'john@example.com' });
    await postRepo.create({ title: 'My First Post', user_id: user.id });
});
```
If any query inside the callback fails, all previous operations in the block are automatically rolled back.

### Transform Hooks

Automate data transformations on your entities.

-   **`@BeforeSave()`**: A method that runs before an entity is created or updated. Perfect for hashing passwords, setting default values, or validation.
-   **`@AfterLoad()`**: A method that runs after an entity is loaded from the database. Ideal for computing properties or formatting data.

```typescript
import { Entity, Column, BeforeSave } from 'lightweight-mysql-orm';
import * as bcrypt from 'bcrypt';

@Entity({ tableName: 'users' })
export class User {
    // ... columns
    @Column()
    password?: string;
    
    @BeforeSave()
    async hashPassword() {
        if (this.password) {
            this.password = await bcrypt.hash(this.password, 10);
        }
    }
}
```

### Custom Error Handling

The ORM throws specific, catchable error classes. This makes your error-handling logic clean and reliable.

-   `EntityMetadataNotFoundError`: Entity configuration is missing or invalid.
-   `ColumnNotFoundError`: A field in `select`, `where`, or `orderBy` is invalid.
-   `SoftDeleteNotSupportedError`: `restore()` was called on an entity that doesn't have soft deletes enabled.
-   `UnsupportedQueryOperatorError`: An invalid operator (e.g., `$foo`) was used in a `where` clause.

```typescript
import { ColumnNotFoundError } from 'lightweight-mysql-orm';

try {
    await userRepo.find({}, { orderBy: { nonExistentField: 'ASC' } });
} catch (error) {
    if (error instanceof ColumnNotFoundError) {
        // Log the error and send a user-friendly response
        console.error(`Query failed due to invalid field: ${error.message}`);
    } else {
        // Handle other errors
    }
}
```

---

## 💡 Best Practices

-   **Centralize Your Pool**: Create your database pool once and export it. Don't create a new pool for every request.
-   **Use `select`**: In production, always specify the columns you need with `select` to reduce data transfer and improve query performance.
-   **Index Foreign Keys**: Ensure your foreign key columns (e.g., `user_id`) are indexed in your database for fast joins.
-   **Index `orderBy` Columns**: Add database indexes to columns you frequently use in `orderBy` clauses.
-   **Validate in Hooks**: Use the `@BeforeSave` hook for validation logic to keep your entities consistent.

---

## ⚡ Performance

This ORM is engineered for speed.
-   **Aggressive Metadata Caching**: On startup, the repository caches all entity, column, and relation metadata. This makes subsequent queries extremely fast as the ORM doesn't need to reflect on your entities repeatedly.
-   **Efficient Data Mapping**: The process of converting database rows to entity objects (`mapToEntity`) and back (`mapToDB`) is highly optimized, minimizing overhead.
-   **Lean Core**: No heavy, unnecessary abstractions.

---

## 📜 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
