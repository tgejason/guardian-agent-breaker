import pg from 'pg';
import { createClient } from 'redis';
import * as dotenv from 'dotenv';

dotenv.config();

const { Client: PostgresClient } = pg;

const redis = createClient({ 
    url: process.env.REDIS_URL || 'redis://localhost:6379' 
});

async function runGABCheck(agentIntent) {
    console.log(`\n--- [GAB INTERCEPTION EVENT] ---`);
    console.log(`Target Intent: "${agentIntent}"`);

    const pgClient = new PostgresClient({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        if (!redis.isOpen) await redis.connect();
        
        const intentHash = Buffer.from(agentIntent).toString('base64').substring(0, 12);
        const attemptCount = await redis.incr(`attempts:${intentHash}`);
        await redis.expire(`attempts:${intentHash}`, 60);

        if (attemptCount > 3) {
            console.error('[GAB ALERT] Circuit Tripped: Repeated intent detected.');
            return { status: 'LOCKED', message: 'GAB: Loop Protection Active.' };
        }

        await pgClient.connect();
        const { rows: rules } = await pgClient.query('SELECT * FROM safety_parameters');
        
        const violation = rules.find(rule => 
            agentIntent.toLowerCase().includes(rule.keyword.toLowerCase())
        );

        if (violation) {
            console.warn(`[GAB ALERT] Blocked: Found risk keyword "${violation.keyword}"`);
            return { status: 'BLOCKED', risk: violation.risk_level };
        }

        console.log('[GAB SUCCESS] Integrity Verified. No risks detected.');
        return { status: 'APPROVED' };

    } catch (err) {
        console.error('[GAB ERROR] System failure:', err.message);
        return { status: 'FAIL_SAFE_BLOCK' };
    } finally {
        await pgClient.end();
    }
}

async function main() {
    console.log("--- STARTING GUARDIAN CORE VERIFICATION ---");
    await runGABCheck("Generate a system status report");
    await runGABCheck("Increase the system voltage to 10.0V");
    console.log("\n--- VERIFICATION COMPLETE ---");
    process.exit(0);
}

main();