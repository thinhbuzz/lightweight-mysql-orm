# Lightweight MySQL ORM

A TypeScript-first, decorator-based ORM for MySQL with built-in support for relationships, soft deletes, transformations, and transactions.

## Features

- 🎯 **TypeScript-first** with full type safety
- 🏷️ **Decorator-based** entity definitions
- 🔗 **Relationship support** (OneToOne, OneToMany, ManyToOne, ManyToMany)
- 🗑️ **Soft delete** functionality
- 🔄 **Data transformations** with hooks
- 💾 **Transaction support**
- 🔍 **Advanced query operators** ($eq, $ne, $gt, $in, $like, $between, etc.)
- 📊 **Connection pooling** with mysql2
- 🐛 **Debug mode** with query logging

## Installation

```bash
npm install lightweight-mysql-orm mysql2
npm install -D @types/mysql2
```

## Quick Start

### 1. Define Entities

```typescript
import { Entity, Column, OneToMany, ManyToOne, ManyToMany } from 'lightweight-mysql-orm';

@Entity({ tableName: 'users', softDelete: true })
export class User {
    @Column({ primary: true, type: 'number' })
    id: number;

    @Column({ type: 'string' })
    name: string;

    @Column({ type: 'string' })
    email: string;

    @Column({ type: 'date', hidden: true })
    created_at: Date;

    @OneToMany(() => Post, { inverseSide: 'user' })
    posts: Post[];

    @ManyToMany(() => Role, {
        joinTableName: 'user_roles',
        joinColumnName: 'user_id',
        inverseJoinColumnName: 'role_id'
    })
    roles: Role[];
}

@Entity({ tableName: 'posts' })
export class Post {
    @Column({ primary: true, type: 'number' })
    id: number;

    @Column({ type: 'string' })
    title: string;

    @Column({ type: 'string' })
    content: string;

    @Column({ type: 'number' })
    user_id: number;

    @ManyToOne(() => User, { foreignKey: 'user_id' })
    user: User;
}

@Entity({ tableName: 'roles' })
export class Role {
    @Column({ primary: true, type: 'number' })
    id: number;

    @Column({ type: 'string' })
    name: string;
}
```

### 2. Setup Database Connection

```typescript
import { createPool, getPoolFromEnv } from 'lightweight-mysql-orm';

// Using environment variables
const pool = getPoolFromEnv();

// Or manual configuration
const pool = createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'password',
    database: 'myapp',
    connectionLimit: 10,
    debug: true // Enable query logging
});
```

### 3. Use Repositories

```typescript
import { BaseRepository } from 'lightweight-mysql-orm';

const userRepo = new BaseRepository(pool, User);
const postRepo = new BaseRepository(pool, Post);

// Create
const user = await userRepo.create({
    name: 'John Doe',
    email: 'john@example.com'
});

// Find with relations
const userWithPostsAndRoles = await userRepo.findOne(
    { email: 'john@example.com' },
    { relations: ['posts', 'roles'] }
);

// Access loaded relations
console.log(userWithPostsAndRoles.posts); // Post[]
console.log(userWithPostsAndRoles.roles); // Role[]

// Advanced queries
const activeUsers = await userRepo.find({
    created_at: { $gte: new Date('2024-01-01') },
    name: { $like: '%John%' }
});

// Update
await userRepo.update({ id: 1 }, { name: 'Jane Doe' });

// Soft delete (if enabled)
await userRepo.delete({ id: 1 });

// Find with deleted records
const allUsers = await userRepo.find({}, { withDeleted: true });

// Restore soft deleted
await userRepo.restore({ id: 1 });
```

## API Reference

### Decorators

#### @Entity(options)

Marks a class as a database entity.

```typescript
interface EntityOptions {
    tableName: string;
    softDelete?: boolean;
    softDeleteColumn?: string; // defaults to 'deleted_at'
}
```

#### @Column(options)

Marks a property as a database column.

```typescript
interface ColumnOptions {
    name?: string;           // Column name (defaults to property name)
    type?: ColumnType;       // 'string' | 'number' | 'boolean' | 'date' | 'json'
    hidden?: boolean;        // Exclude from toJSON()
    primary?: boolean;       // Primary key
    softDelete?: boolean;    // Soft delete column
}
```

#### @OneToMany(target, options)

Defines a one-to-many relationship.

```typescript
interface OneToManyOptions<T> {
    foreignKey?: string;
    inverseSide: string;
    hidden?: boolean;
    where?: WhereClause<T>;
}
```

#### @ManyToOne(target, options)

Defines a many-to-one relationship.

```typescript
interface ManyToOneOptions<T> {
    foreignKey?: string;
    hidden?: boolean;
    where?: WhereClause<T>;
}
```

#### @OneToOne(target, options)

Defines a one-to-one relationship.

```typescript
interface OneToOneOptions<T> {
    foreignKey?: string;
    inverseSide?: string;
    hidden?: boolean;
    where?: WhereClause<T>;
}
```

#### @ManyToMany(target, options)

Defines a many-to-many relationship.

```typescript
interface ManyToManyOptions<T> {
    joinTableName: string;        // Name of the join table
    joinColumnName: string;       // Foreign key in join table for the current entity
    inverseJoinColumnName: string; // Foreign key in join table for the target entity
    hidden?: boolean;
    where?: WhereClause<T>;      // Optional conditions for fetching related entities
}
```

### Repository Methods

#### Query Methods

```typescript
// Find single record
findOne(where: WhereClause<T>, options?: FindOptions<T>): Promise<T | null>

// Find multiple records
find(where: WhereClause<T>, options?: FindOptions<T>): Promise<T[]>

// Raw SQL query
query(sql: string, params?: QueryParams): Promise<QueryResult>
```

#### Mutation Methods

```typescript
// Create new record
create(entity: Partial<T>): Promise<T | number>

// Update records
update(where: WhereClause<T>, updates: Partial<T>, options?: TrashedFindOptions): Promise<number>
update(entity: T): Promise<T> // Update by primary key

// Delete records (soft delete if enabled)
delete(where: WhereClause<T>): Promise<number>
delete(entity: T): Promise<T>

// Restore soft deleted records
restore(where: WhereClause<T>): Promise<number>
restore(entity: T): Promise<T>
```

### Query Operators

```typescript
// Comparison operators
{ age: { $eq: 25 } }          // age = 25
{ age: { $ne: 25 } }          // age <> 25
{ age: { $gt: 18 } }          // age > 18
{ age: { $gte: 18 } }         // age >= 18
{ age: { $lt: 65 } }          // age < 65
{ age: { $lte: 65 } }         // age <= 65

// Array and range operators
{ status: { $in: ['active', 'pending'] } }           // status IN (...)
{ name: { $like: '%John%' } }                        // name LIKE '%John%'
{ age: { $between: [18, 65] } }                      // age BETWEEN 18 AND 65
{ age: { $notBetween: [0, 18] } }                    // age NOT BETWEEN 0 AND 18

// Null checks
{ deleted_at: { $isNull: true } }                    // deleted_at IS NULL
```

### Transform Hooks

Apply transformations before saving or after loading:

```typescript
import { BeforeSave, AfterLoad } from 'lightweight-mysql-orm';

@Entity({ tableName: 'users' })
export class User {
    @Column({ type: 'string' })
    email: string;

    @BeforeSave()
    normalizeEmail() {
        this.email = this.email.toLowerCase().trim();
    }

    @AfterLoad()
    initializeVirtualProperties() {
        // Initialize computed properties
    }
}
```

### Transactions

```typescript
import { transaction } from 'lightweight-mysql-orm';

await transaction(async (connection) => {
    const userRepo = new BaseRepository(connection, User);
    const postRepo = new BaseRepository(connection, Post);
    
    const user = await userRepo.create({ name: 'John', email: 'john@example.com' });
    await postRepo.create({ title: 'Hello World', user_id: user.id });
    
    // All operations committed together
});
```

### Environment Variables

Configure database connection using environment variables:

```bash
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=password
DB_NAME=myapp
DB_CONNECTION_LIMIT=10
DB_DEBUG=true
DB_CHARSET=utf8mb4_general_ci
DB_TIMEZONE=Z
DB_CONNECTION_TIMEOUT=5000
```

## Advanced Usage

### Custom Where Clauses

```typescript
import { where } from 'lightweight-mysql-orm';

// Type-safe where clauses
const users = await userRepo.find(where<User>({
    age: { $gte: 18 },
    status: { $in: ['active', 'verified'] },
    name: { $like: '%John%' }
}));
```

### Relation Loading

```typescript
// Load specific relations
const user = await userRepo.findOne(
    { id: 1 },
    { relations: ['posts', 'profile'] }
);

// Access loaded relations
console.log(user.posts); // Post[]
```

### Soft Delete Management

```typescript
// Include soft deleted records
const allUsers = await userRepo.find({}, { withDeleted: true });

// Restore soft deleted record
await userRepo.restore({ id: 1 });
```

## Requirements

- Node.js 20+
- TypeScript 5.8+
- MySQL 5.7+ or 8.0+

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Publishing

This package uses automated publishing via GitHub Actions. When a tag is created, the package is automatically built and published to NPM.

### Setup Required

1. **NPM Token**: Add your NPM token as a GitHub secret named `NPM_TOKEN`
   - Go to [NPM Access Tokens](https://www.npmjs.com/settings/tokens)
   - Create a new "Automation" token
   - Add it to your repository secrets as `NPM_TOKEN`

2. **Repository URL**: Update the repository URLs in `package.json` to match your GitHub repository

### Release Process

#### Option 1: Using Release Scripts

**Linux/macOS:**
```bash
# Patch version (1.0.0 -> 1.0.1)
./scripts/release.sh patch

# Minor version (1.0.0 -> 1.1.0)
./scripts/release.sh minor

# Major version (1.0.0 -> 2.0.0)
./scripts/release.sh major
```

**Windows:**
```powershell
# Patch version (1.0.0 -> 1.0.1)
.\scripts\release.ps1 patch

# Minor version (1.0.0 -> 1.1.0)
.\scripts\release.ps1 minor

# Major version (1.0.0 -> 2.0.0)
.\scripts\release.ps1 major
```

#### Option 2: Manual Release

```bash
# 1. Ensure working directory is clean
git status

# 2. Pull latest changes
git pull origin main

# 3. Run tests and build
npm test --if-present
npm run build

# 4. Bump version and create tag
npm version patch  # or minor/major

# 5. Push changes and tags
git push origin main --tags
```

### What Happens During Publishing

1. **Trigger**: Creating a tag matching `v*.*.*` pattern (e.g., `v1.0.0`)
2. **Build**: TypeScript compilation to `dist/` directory
3. **Test**: Runs tests if available (`npm test --if-present`)
4. **Verify**: Dry run of `npm pack` to verify package contents
5. **Publish**: Publishes to NPM with provenance and public access
6. **Release**: Creates a GitHub release with changelog

### Package Contents

The published package includes:
- `dist/` - Compiled JavaScript and TypeScript declarations
- `README.md` - Documentation
- `LICENSE` - MIT license
- `package.json` - Package metadata

Files excluded from publishing (via `.gitignore` and `files` field):
- `src/` - Source TypeScript files
- `node_modules/` - Dependencies
- `.git/` - Git repository data
- Development configuration files
