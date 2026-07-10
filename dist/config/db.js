"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const loadEnv_1 = require("./loadEnv");
(0, loadEnv_1.loadEnv)();
const CRITICAL_COLLECTIONS = new Set([
    "users",
    "companies",
    "teams",
    "timesessions",
    "activitylogs",
    "screenshots",
]);
function maskMongoUri(uri) {
    return uri.replace(/\/\/([^:]+):([^@]+)@/, "//***:***@");
}
function getConnectOptions() {
    const options = {};
    if (process.env.MONGO_DB_NAME) {
        options.dbName = process.env.MONGO_DB_NAME;
    }
    return options;
}
async function removeMaliciousTtlIndexes() {
    const db = mongoose_1.default.connection.db;
    if (!db)
        return;
    const collections = await db.listCollections().toArray();
    for (const { name } of collections) {
        if (name.startsWith("system."))
            continue;
        const indexes = await db.collection(name).indexes();
        const isCritical = CRITICAL_COLLECTIONS.has(name.toLowerCase());
        for (const idx of indexes) {
            if (idx.expireAfterSeconds == null || !idx.name)
                continue;
            const keyFields = Object.keys(idx.key);
            const isDangerousTtl = isCritical ||
                keyFields.includes("createdAt") ||
                keyFields.includes("updatedAt") ||
                /readme|warning|recover/i.test(name);
            if (!isDangerousTtl) {
                console.warn(`[DB] TTL index on "${name}" (${idx.name}) — review if intentional`);
                continue;
            }
            console.error(`[DB SECURITY] Removing TTL index on "${name}" ` +
                `(${idx.name}, keys=${JSON.stringify(idx.key)}, expireAfterSeconds=${idx.expireAfterSeconds})`);
            await db.collection(name).dropIndex(idx.name);
        }
    }
}
async function logRansomwareIndicators() {
    const db = mongoose_1.default.connection.db;
    if (!db)
        return;
    const collections = await db.listCollections().toArray();
    for (const { name } of collections) {
        if (!/readme|warning|recover/i.test(name))
            continue;
        const count = await db.collection(name).countDocuments();
        console.error(`[DB SECURITY] Suspicious collection "${name}" (${count} docs) — possible ransomware artifact`);
    }
}
async function logCollectionStats() {
    const db = mongoose_1.default.connection.db;
    if (!db)
        return;
    for (const name of CRITICAL_COLLECTIONS) {
        try {
            const count = await db.collection(name).countDocuments();
            console.log(`[DB] ${name}: ${count} documents`);
        }
        catch {
            // Collection may not exist yet.
        }
    }
}
async function auditCompaniesCollection() {
    const db = mongoose_1.default.connection.db;
    if (!db)
        return;
    const companies = db.collection("companies");
    const count = await companies.countDocuments();
    const indexes = await companies.indexes();
    console.log(`[DB] companies audit: ${count} document(s)`);
    for (const idx of indexes) {
        if (idx.expireAfterSeconds != null) {
            console.error(`[DB SECURITY] companies still has TTL index "${idx.name}" — companies will auto-delete!`);
        }
    }
}
const connectDB = async () => {
    if (!process.env.MONGO_URI) {
        throw new Error("MONGO_URI not defined in environment");
    }
    await mongoose_1.default.connect(process.env.MONGO_URI, getConnectOptions());
    const { host, name } = mongoose_1.default.connection;
    console.log(`[DB] Connected: host=${host} database=${name}`);
    console.log(`[DB] URI (masked): ${maskMongoUri(process.env.MONGO_URI)}`);
    if (!process.env.MONGO_DB_NAME && (name === "test" || !name)) {
        console.warn("[DB WARNING] Using default/test database. Set MONGO_DB_NAME=staffolio in .env.");
    }
    await removeMaliciousTtlIndexes();
    await logRansomwareIndicators();
    await logCollectionStats();
    await auditCompaniesCollection();
};
exports.default = connectDB;
