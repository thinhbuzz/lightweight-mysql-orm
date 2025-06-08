import type { Pool, PoolOptions } from 'mysql2/promise';
import { createPool as mySQLCreatePool } from 'mysql2/promise';

export interface Options {
    printQuery?: boolean;
    sourceEntityIdAlias?: string;
}

export const options: Options = {
    printQuery: false,
    sourceEntityIdAlias: '_orm_source_fk_',
};

export function setOptions(newOptions: Options): Options {
    Object.assign(options, newOptions);
    return options;
}

export const createPool = (config: PoolOptions): Pool => {
    if (config.debug) {
        setOptions({ printQuery: true });
        delete config.debug;
        console.log('MySQL Pool Debug Mode Enabled');
    }
    return mySQLCreatePool(config);
};

export const getPoolFromEnv = () => {
    return createPool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'test',
        connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10'),
        debug: process.env.DB_DEBUG === 'true',
        charset: process.env.DB_CHARSET || 'utf8mb4_general_ci',
        timezone: process.env.DB_TIMEZONE || 'Z',
        connectTimeout: parseInt(process.env.DB_CONNECTION_TIMEZONE || '5000'),
    });
};
