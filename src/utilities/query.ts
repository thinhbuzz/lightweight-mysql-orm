import type { WhereClause } from '../types/common';

export function where<T>(whereClause: WhereClause<T>): WhereClause<T> {
    return whereClause;
}
