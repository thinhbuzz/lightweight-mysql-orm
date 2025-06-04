import type { Pool, PoolConnection } from 'mysql2/promise';

export async function transaction<T>(callback: (connection: PoolConnection) => Promise<T>, pool: Pool): Promise<T> {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
        const result = await callback(connection);
        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}
