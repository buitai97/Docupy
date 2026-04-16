import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

const client = new SSMClient({ region: process.env.AWS_REGION ?? "us-east-2" });

async function getParam(name: string): Promise<string> {
    const response = await client.send(
        new GetParameterCommand({ Name: name, WithDecryption: true })
    );
    const value = response.Parameter?.Value;
    if (!value) throw new Error(`SSM parameter "${name}" is missing or empty.`);
    return value;
}

export interface AppConfig {
    dbHost: string;
    dbPort: number;
    dbName: string;
    dbUser: string;
    dbPassword: string;
    jwtSecret: string;
    openaiApiKey: string;
    googleClientId: string;
    googleClientSecret: string;
    frontendUrl: string;
}

function applyConfig(config: AppConfig): AppConfig {
    process.env.DB_HOST              = config.dbHost;
    process.env.DB_PORT              = String(config.dbPort);
    process.env.DB_NAME              = config.dbName;
    process.env.DB_USER              = config.dbUser;
    process.env.DB_PASSWORD          = config.dbPassword;
    process.env.JWT_SECRET           = config.jwtSecret;
    process.env.OPENAI_API_KEY       = config.openaiApiKey;
    process.env.GOOGLE_CLIENT_ID     = config.googleClientId;
    process.env.GOOGLE_CLIENT_SECRET = config.googleClientSecret;
    process.env.FRONTEND_URL         = config.frontendUrl;
    return config;
}

// On EC2 with an IAM role attached, no credentials are needed.
// Locally, fall back to process.env so development works without SSM.
export async function loadConfig(): Promise<AppConfig> {
    const useSSM = process.env.USE_SSM === "true";

    if (!useSSM) {
        return applyConfig({
            dbHost:             process.env.DB_HOST ?? "localhost",
            dbPort:             Number(process.env.DB_PORT ?? 5432),
            dbName:             process.env.DB_NAME ?? "rag_app",
            dbUser:             process.env.DB_USER ?? "postgres",
            dbPassword:         process.env.DB_PASSWORD ?? "",
            jwtSecret:          process.env.JWT_SECRET ?? "",
            openaiApiKey:       process.env.OPENAI_API_KEY ?? "",
            googleClientId:     process.env.GOOGLE_CLIENT_ID ?? "",
            googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
            frontendUrl:        process.env.FRONTEND_URL ?? "http://localhost:3000",
        });
    }

    const [dbHost, dbPort, dbName, dbUser, dbPassword, jwtSecret, openaiApiKey, googleClientId, googleClientSecret, frontendUrl] =
        await Promise.all([
            getParam("DB_HOST"),
            getParam("DB_PORT"),
            getParam("DB_NAME"),
            getParam("DB_USER"),
            getParam("DB_PASSWORD"),
            getParam("JWT_SECRET"),
            getParam("OPENAI_API_KEY"),
            getParam("GOOGLE_CLIENT_ID"),
            getParam("GOOGLE_CLIENT_SECRET"),
            getParam("FRONTEND_URL"),
        ]);

    return applyConfig({
        dbHost,
        dbPort: Number(dbPort),
        dbName,
        dbUser,
        dbPassword,
        jwtSecret,
        openaiApiKey,
        googleClientId,
        googleClientSecret,
        frontendUrl,
    });
}
