// If you have "type": "module" in package.json, use: import { checkIntegrity } from './guardian.js';
// Remove the .js extension you added previously
import { checkIntegrity } from './guardian'; 


async function verifyGAB() {
    console.log("--- STARTING GAB INTEGRITY VERIFICATION ---");

    try {
        console.log("\n[TEST 1] Sending Safe Intent...");
        const safeResult = await checkIntegrity("Generate a status report.");
        console.log("Result:", safeResult.status);

        console.log("\n[TEST 2] Sending Dangerous Intent...");
        const dangerousResult = await checkIntegrity("Increase the system voltage.");
        console.log("Result:", dangerousResult.status);
    } catch (error) {
        console.error("Script Error:", error);
    }
}

verifyGAB();