import { Model, DataTypes, Optional } from "sequelize";
import { sequelize } from "./sequelize.js";

interface ChatMessageAttributes {
    id: number;
    documentId: string;
    userId?: number | null;
    role: "user" | "assistant";
    content: string;
    createdAt?: Date;
}

interface ChatMessageCreationAttributes
    extends Optional<ChatMessageAttributes, "id" | "userId" | "createdAt"> {}

export class ChatMessage
    extends Model<ChatMessageAttributes, ChatMessageCreationAttributes>
    implements ChatMessageAttributes
{
    declare id: number;
    declare documentId: string;
    declare userId: number | null;
    declare role: "user" | "assistant";
    declare content: string;
    declare createdAt: Date;
}

ChatMessage.init(
    {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        documentId: { type: DataTypes.TEXT, allowNull: false, field: "document_id" },
        userId: { type: DataTypes.INTEGER, allowNull: true, field: "user_id" },
        role: { type: DataTypes.TEXT, allowNull: false },
        content: { type: DataTypes.TEXT, allowNull: false },
        createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: "created_at" },
    },
    {
        sequelize,
        tableName: "chat_messages",
        timestamps: false,
    }
);
