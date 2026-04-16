import { Model, DataTypes, Optional } from "sequelize";
import { sequelize } from "./sequelize.js";

interface UserAttributes {
    id: number;
    name: string;
    email: string;
    passwordHash?: string | null;
    googleId?: string | null;
    createdAt?: Date;
}

interface UserCreationAttributes extends Optional<UserAttributes, "id" | "passwordHash" | "googleId" | "createdAt"> {}

export class User
    extends Model<UserAttributes, UserCreationAttributes>
    implements UserAttributes
{
    declare id: number;
    declare name: string;
    declare email: string;
    declare passwordHash: string | null;
    declare googleId: string | null;
    declare createdAt: Date;
}

User.init(
    {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        name: { type: DataTypes.TEXT, allowNull: false },
        email: { type: DataTypes.TEXT, allowNull: false, unique: true },
        passwordHash: { type: DataTypes.TEXT, allowNull: true, field: "password_hash" },
        googleId: { type: DataTypes.TEXT, allowNull: true, unique: true, field: "google_id" },
        createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: "created_at" },
    },
    {
        sequelize,
        tableName: "users",
        timestamps: false,
    }
);
