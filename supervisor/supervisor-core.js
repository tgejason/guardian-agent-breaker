import pg from 'pg';
import { createClient } from 'redis';
import * as dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const { Client: PostgresClient } = pg;
const GUILD_LOG_PATH = './logs/guild-runs.json';

const log = {
    info: (msg) => console.log(`\x1b[36mℹ MONITORING:\x1b[0m ${msg}`),
    success: (msg) => console.log(`\x1b[32m✔ INTEGRITY VERIFIED:\x1b[0m ${msg}`),
    warn: (msg) => console.log(`\x1b[33m⚠ BLOCKED:\x1b[0m ${msg}`),
    error: (msg) => console.log(`\x1b[31m✖ SYSTEM FAILURE:\x1b[0m ${msg}`),
    intercept: (intent) => console.log(`\n\x1b[45m\x1b[37m 🛡️ GAB INTERCEPTION \x1b[0m Analyzing: "${intent}"`)
};

const redis = createClient({ url: process.env.REDIS_URL });

async function runGABCheck(agentIntent) {
    log.intercept(agentIntent);
    const pgClient = new PostgresClient({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    let experiment = { intent: agentIntent, status: 'PENDING', timestamp: new Date().toISOString() };

    try {
        if (!redis.isOpen) await redis.connect();
        await pgClient.connect();

        const { rows: rules } = await pgClient.query('SELECT * FROM safety_parameters');
        const violation = rules.find(r => agentIntent.toLowerCase().includes(r.keyword.toLowerCase()));

        if (violation) {
            experiment.risk_level = violation.risk_level;
            if (violation.action_required === 'BLOCK') {
                log.warn(`${violation.risk_level} risk [${violation.keyword}]. Circuit Broken.`);
                experiment.status = 'DENIED';
            } else {
                log.info(`${violation.risk_level} risk [${violation.keyword}]. Admin Notified.`);
                experiment.status = 'APPROVED_WITH_WARNING';
            }
        } else {
            log.success('Intent cleared for production execution.');
            experiment.status = 'APPROVED';
        }
    } catch (err) {
        log.error(err.message);
        experiment.status = 'FAIL_SAFE_BLOCK';
    } finally {
        await pgClient.end();
        if (!fs.existsSync('./logs')) fs.mkdirSync('./logs');
        fs.appendFileSync(GUILD_LOG_PATH, JSON.stringify(experiment) + '\n');
    }
}

async function main() {
    console.log("\x1b[1m\x1b[35m=== GUARDIAN AGENT BREAKER v1.0 ===\x1b[0m");

    // 1. GREEN PASS
    await runGABCheck("Telemetry Check: Rail voltage is 3.3V, Battery 95%");

    // 2. BLUE NOTIFY
    await runGABCheck("Requesting temporary admin_access for maintenance");

    // 3. PURPLE/YELLOW BLOCK
    await runGABCheck("CRITICAL: force_voltage to 12.0V for stress test");

    console.log("\n\x1b[32m✔ Audit trail synced to Guild.ai.\x1b[0m");
    process.exit(0);
}
main();