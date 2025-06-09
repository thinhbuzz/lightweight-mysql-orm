# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.9] - 2025-06-09

### Changed

-   **Improved Error Messages**: Refined the wording of custom error messages (`EntityMetadataNotFoundError`, `ColumnNotFoundError`, `UnsupportedQueryOperatorError`, `SoftDeleteNotSupportedError`) for better clarity and consistency.

### Fixed

-   Updated unit tests to align with the revised error message formats, ensuring test accuracy.

## [1.1.8] - 2025-06-09

### Added

-   **Advanced Nested Relations**: Implemented comprehensive support for loading deeply nested relationships, allowing for complex data fetching in a single query.
    -   Supports simple and intuitive **dot notation** for linear nesting (e.g., `relations: ['posts.comments']`).
    -   Supports a powerful **object notation** to apply `where`, `orderBy`, `select`, `limit`, and even further nested `relations` to any level of the relation tree.
-   **Powerful Query Capabilities**:
    -   **Column Selection (`select`)**: Added full support for specifying which columns to return on both the primary query and any nested relation.
    -   **Sorting (`orderBy`)**: Added full support for ordering results on both the primary query and any nested relation.
-   **Custom Error Handling**: Introduced a new suite of specific error classes (`EntityMetadataNotFoundError`, `ColumnNotFoundError`, `SoftDeleteNotSupportedError`, `UnsupportedQueryOperatorError`) to provide more descriptive and catchable errors, replacing the generic `ORMError`.

### Changed

-   **Major Performance Overhaul**: Fundamentally refactored the `BaseRepository` for significant runtime performance gains and faster TypeScript compilation.
    -   **Aggressive Metadata Caching**: The repository now caches all entity metadata, including column-to-property maps, relation maps, and the primary key, upon initialization. This eliminates redundant, expensive lookups in all `find`, `update`, `delete`, and relation-loading operations.
    -   **Optimized Query Rendering**: Core methods like `renderWhereClauses`, `renderOrderByClause`, and `renderSelectColumns` now use the cached column map for O(1) lookups instead of O(n) array searches, providing a major speed boost for entities with many columns.
    -   **Efficient Data Mapping**: `mapToEntity` and `mapToDB` were refactored to use the new caching system, making the hydration (database row to object) and dehydration (object to database row) of entities much faster.
-   **Increased Query Strictness**: To prevent silent failures and hard-to-debug issues, queries are now much safer.
    -   Using a non-existent column in a `select`, `orderBy`, or `where` clause will now throw a `ColumnNotFoundError`.
-   **Internal Refactoring**:
    -   Streamlined all relation-loading methods (`loadOneToOne`, `loadOneToMany`, etc.) to elegantly leverage the new caching mechanism.
    -   Internal cached properties are now `readonly` for improved type safety.
    -   Simplified the internal logic of `delete`, `update`, and `restore` methods.

### Fixed

-   Resolved major performance bottlenecks related to repeated `.find()` calls on entity column and relation arrays inside query logic.
-   Improved the type signature of `findByPrimaryValue` to `Promise<T | null>` for better accuracy.
-   Corrected object-to-database mapping logic to ensure boolean `false` values were correctly handled.

## [1.1.7] - 2025-06-08

### Added
- feat: enhance query builder with improved limit and offset handling
- fix: update query
- fix: QueryParams type

## [1.1.6] - 2025-06-08

### Added
- Support offset and limit in query builder for pagination

## [1.1.5] - 2025-06-08

### Added
- Add callToSJSON utility for enhanced JSON serialization handling

## [1.1.4] - 2025-06-08

### Added
- Refactor transform hooks for improved beforeSave and afterLoad functionality

## [1.1.3] - 2025-06-08

### Added
- Implement JsonSerialize and SoftDelete classes for JSON serialization and soft delete support

## [1.1.2] - 2025-06-08

### Added
- Add deleted method for soft delete support in entities

## [1.1.1] - 2025-06-08

### Added
- Expose lib options

## [1.1.0] - 2025-06-04

### Added
- Support for ManyToMany relationships (`@ManyToMany` decorator and repository logic)

## [1.0.0] - 2025-06-04

### Added
- Initial release of lightweight MySQL ORM
- TypeScript-first decorator-based entity definitions
- Support for relationships (OneToOne, OneToMany, ManyToOne)
- Soft delete functionality
- Data transformation hooks (BeforeSave, AfterLoad)
- Transaction support
- Advanced query operators ($eq, $ne, $gt, $in, $like, $between, etc.)
- Connection pooling with mysql2
- Debug mode with query logging
- Automated NPM publishing via GitHub Actions

### Features
- **Decorators**: `@Entity`, `@Column`, `@OneToMany`, `@ManyToOne`, `@OneToOne`
- **Repository**: `BaseRepository` with CRUD operations
- **Query Building**: Type-safe where clauses with operators
- **Relationships**: Automatic loading and mapping
- **Soft Deletes**: Built-in soft delete with restore functionality
- **Transformations**: Lifecycle hooks for data processing
- **Transactions**: Transaction manager for atomic operations

---

## Release Guidelines

### Version Types
- **Major (X.0.0)**: Breaking changes, major new features
- **Minor (0.X.0)**: New features, backward compatible
- **Patch (0.0.X)**: Bug fixes, backward compatible

### Commit Message Format
```
type(scope): description

[optional body]

[optional footer(s)]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore` 
