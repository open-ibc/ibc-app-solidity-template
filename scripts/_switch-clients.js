const fs = require('fs');
const { getConfigPath } = require('./_helpers.js');

// Function to update config.json
function flipConfig() {
    try {
        const configPath = getConfigPath();
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        // Create a temporary copy of the config object to store a backup of the current values
        // The backup is used when switching back to between clients
        const tempConfig = {...config};
    
        // Below, we'll update the config object

        // Flip the proofsEnabled flag
        config["proofsEnabled"] = !config["proofsEnabled"];

        if (config.backup !== undefined && typeof config.backup === 'object' && Object.keys(config.backup).length > 0) {
            const source = tempConfig["createChannel"]["srcChain"];
            const destination = tempConfig["createChannel"]["dstChain"];
            
            // Update the createChannel object with backup values 
            config["createChannel"]["srcAddr"] = config["backup"]["sendPacket"][`${source}`]["portAddr"];
            config["createChannel"]["dstAddr"] = config["backup"]["sendPacket"][`${destination}`]["portAddr"];

            // Update the sendPacket and sendUniversalPacket object with backup values
            config["sendPacket"] = config["backup"]["sendPacket"];
            config["sendUniversalPacket"] = config["backup"]["sendUniversalPacket"];

        }
        
        // Write a new backup object to the config
        config["backup"] = {
            "sendPacket": tempConfig["sendPacket"],
            "sendUniversalPacket": tempConfig["sendUniversalPacket"]
        };

        // Write the updated config back to the file
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        console.log('Config updated');
    } catch (error) {
        console.error(`Failed to update config: ${error.message}`);
        process.exit(1);
    }
}

flipConfig();
