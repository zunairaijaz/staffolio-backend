"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const db_1 = __importDefault(require("./config/db"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const cors_1 = __importDefault(require("cors"));
const timeSession_routes_1 = __importDefault(require("./routes/timeSession.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const screenshots_routes_1 = __importDefault(require("./routes/screenshots.routes"));
const activity_routes_1 = __importDefault(require("./routes/activity.routes"));
const team_routes_1 = __importDefault(require("./routes/team.routes"));
const company_routes_1 = __importDefault(require("./routes/company.routes"));
const reports_routes_1 = __importDefault(require("./routes/reports.routes"));
const dashboard_routes_1 = __importDefault(require("./routes/dashboard.routes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const allowedOrigins = (process.env.CORS_ORIGINS ??
    "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001,https://staffolio.corbissoft.com,https://www.staffolio.corbissoft.com,https://staffolioadmin.corbissoft.com")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
const corsOptions = {
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            console.warn(`CORS blocked origin: ${origin}`);
            callback(null, false);
        }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
        "Content-Type",
        "Authorization",
        "x-company-id",
        "userid",
    ],
    credentials: true,
};
if (process.env.IIS_MANAGES_CORS !== "true") {
    app.use((0, cors_1.default)(corsOptions));
    app.options(/.*/, (0, cors_1.default)(corsOptions));
}
app.use(express_1.default.json({ limit: "10mb" }));
app.use(express_1.default.urlencoded({ extended: true }));
app.get("/", (_req, res) => {
    res.json({ status: "ok", message: "Staffolio API is running" });
});
app.get("/api/health", async (_req, res) => {
    let companies = 0;
    let users = 0;
    try {
        const db = mongoose_1.default.connection.db;
        if (db) {
            companies = await db.collection("companies").countDocuments();
            users = await db.collection("users").countDocuments();
        }
    }
    catch {
        // ignore count errors on health check
    }
    res.json({
        status: "ok",
        message: "Staffolio API is running",
        db: mongoose_1.default.connection.readyState,
        database: mongoose_1.default.connection.name,
        companies,
        users,
        jwt: Boolean(process.env.JWT_ACCESS_SECRET),
    });
});
app.post("/api/health", (_req, res) => {
    res.json({
        status: "ok",
        message: "POST routing works",
        db: mongoose_1.default.connection.readyState,
    });
});
app.use("/api/auth", auth_routes_1.default);
app.use("/api/time-session", timeSession_routes_1.default);
app.use("/api/user", user_routes_1.default);
app.use("/api/screenshots", screenshots_routes_1.default);
app.use("/api/activity", activity_routes_1.default);
app.use("/api/teams", team_routes_1.default);
app.use("/api/company", company_routes_1.default);
app.use("/api/reports", reports_routes_1.default);
app.use("/api/dashboard", dashboard_routes_1.default);
const PORT = process.env.PORT || 5000;
(0, db_1.default)()
    .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
})
    .catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
});
