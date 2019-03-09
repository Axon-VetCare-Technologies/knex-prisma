import knex from 'knex';
import { initializeKnexPrisma } from './generated/knex-prisma';

if (!process.env.POSTGRES_HOST) {
  const dotenv = require('dotenv');
  const result = dotenv.config();
}

const config = {
  client: 'pg',
  connection: {
    host: process.env.POSTGRES_HOST,
    database: process.env.POSTGRES_DATABASE,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    port: process.env.POSTGRES_PORT,
  },
  debug: true,
} as knex.Config;
export const postgres = knex(config);

export const knexPrismaBag = initializeKnexPrisma({
  knex: postgres,
  schema: process.env.POSTGRES_SCHEMA,
});

