# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

## [1.1.2] - 2025-06-08

### Added
- Add trashed method for soft delete support in entities

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