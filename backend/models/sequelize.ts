import { Sequelize } from "sequelize";

export const sequelize = new Sequelize({
    dialect: "postgres",
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    },
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 5432),
    database: process.env.DB_NAME ?? "rag_app",
    username: process.env.DB_USER ?? "postgres",
    password: process.env.DB_PASSWORD,
    logging: false,
});
