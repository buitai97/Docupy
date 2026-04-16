import { Model, DataTypes, Optional } from "sequelize";
import { sequelize } from "./sequelize.js";

interface DocumentAttributes {
    id: number;
    content: string;
    embedding: string;
    documentId: string;
    userId?: number | null;
    name?: string | null;
}

interface DocumentCreationAttributes extends Optional<DocumentAttributes, "id" | "userId" | "name"> {}

export class Document
    extends Model<DocumentAttributes, DocumentCreationAttributes>
    implements DocumentAttributes
{
    declare id: number;
    declare content: string;
    declare embedding: string;
    declare documentId: string;
    declare userId: number | null;
    declare name: string | null;
}

Document.init(
    {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        content: { type: DataTypes.TEXT, allowNull: false },
        // Stored as pgvector in DB — use TEXT here to avoid Sequelize altering the column
        embedding: { type: DataTypes.TEXT, allowNull: false },
        documentId: { type: DataTypes.TEXT, allowNull: false, field: "document_id" },
        userId: { type: DataTypes.INTEGER, allowNull: true, field: "user_id" },
        name: { type: DataTypes.TEXT, allowNull: true },
    },
    {
        sequelize,
        tableName: "documents",
        timestamps: false,
    }
);
