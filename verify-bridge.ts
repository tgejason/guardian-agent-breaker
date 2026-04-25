import { createClient } from '@supabase/supabase-js';
import { createClient as createRedis } from 'redis';
import { Client as PostgresClient } from 'pg'; // You'll need: npm install pg
import dotenv from 'dotenv';

dotenv.config();

async function deepDebug() {
    console.log("--- [GAB PATHFINDER: NAILING THE BRIDGE] ---");

    let url = process.env.INSFORGE_PROJECT_URL?.replace(/\/+$/, '') || '';
    const key = process.env.INSFORGE_ANON_KEY || '';
    const dbUrl = process.env.DATABASE_URL || '';

    // 1. Redis Check
    try {
        const redis = createRedis({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
        await redis.connect();
        console.log("✅ Redis: Connected");
        await redis.quit();
    } catch (e) { console.log("❌ Redis: Failed"); }

    // 2. The REST Path Hunter
    const pathsToTest = [
        "/rest/v1/safety_parameters",
        "/api/v1/safety_parameters",
        "/safety_parameters"
    ];

    console.log(`[SYSTEM] Testing REST base URL: ${url}`);
    let restSuccess = false;

    for (const path of pathsToTest) {
        const fullUrl = `${url}${path}`;
        try {
            const response = await fetch(fullUrl, { headers: { 'apikey': key } });
            const text = await response.text();

            if (response.ok && !text.includes("<!DOCTYPE html>")) {
                console.log(`🎯 REST FOUND! Status: ${response.status}`);
                restSuccess = true;
                break;
            }
        } catch (e) { /* Silent fail for hunter */ }
    }

    // Update this part in your verify-bridge.ts
    const pgClient = new PostgresClient({
        connectionString: dbUrl,
        ssl: {
            // This is the "Magic Key" for cloud databases
            rejectUnauthorized: false
        }
    });

    if (!restSuccess) {
        console.log("⚠️ REST Gateway still failing (404/Cannot GET).");
    }

    // 3. THE ENHANCEMENT: Direct SQL failover
    console.log("\n--- [DIRECT SQL BRIDGE: FAILOVER] ---");
    if (!dbUrl) {
        console.log("❌ Skip: DATABASE_URL not found in .env");
    } else {
        const pgClient = new PostgresClient({
            connectionString: dbUrl,
            ssl: { rejectUnauthorized: false }
        });

        try {
            await pgClient.connect();
            console.log("✅ SQL Bridge: Connected directly via 5432");
            const res = await pgClient.query('SELECT * FROM safety_parameters LIMIT 1;');
            console.log(`📊 Table Check: Found ${res.rowCount} row(s) in 'safety_parameters'`);
        } catch (err: any) {
            console.log(`❌ SQL Bridge: Failed - ${err.message}`);
        } finally {
            await pgClient.end();
        }
    }

    console.log("\n--- [FINAL VERDICT] ---");
    if (restSuccess) {
        console.log("Result: REST API is active. You can use the standard Supabase client.");
    } else {
        console.log("Result: REST is down, but SQL Bridge is your path forward for the hackathon.");
    }


}

deepDebug();