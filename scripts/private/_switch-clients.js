const fs = require('fs');
const { getConfigPath } = require('./_helpers.js');
const ibcConfig = require('../../ibc.json');

// Function to update config.json
function flipConfig() {
    try {
        const configPath = getConfigPath();
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        // Create a temporary copy of the config object to store a backup of the current values
        // The backup is used when switching back to between clients
        const tempConfig = {...config};
        const source = tempConfig["createChannel"]["srcChain"];
        const destination = tempConfig["createChannel"]["dstChain"];
    
        // Below, we'll update the config object
        if (config.backup !== undefined && typeof config.backup === 'object' && Object.keys(config.backup).length > 0) {
            // Update the createChannel object with backup values 
            config["createChannel"]["srcAddr"] = config["backup"]["sendPacket"][`${source}`]["portAddr"];
            config["createChannel"]["dstAddr"] = config["backup"]["sendPacket"][`${destination}`]["portAddr"];

            // Update the sendPacket and sendUniversalPacket object with backup values
            config["sendPacket"] = config["backup"]["sendPacket"];
            config["sendUniversalPacket"] = config["backup"]["sendUniversalPacket"];
        } else {
            // If no backup object is provided, use the default values
            config["createChannel"] = {
                "srcChain": source,
                "srcAddr": "0x1234567890AbCdEf1234567890aBcDeF12345678",
                "dstChain": destination,
                "dstAddr": "0x1234567890AbCdEf1234567890aBcDeF12345678",
                "version": "1.0",
                "ordering": 0,
                "fees": false
              };
              config["sendPacket"] = {
                "optimism": {
                    "portAddr": "0x1234567890abcdef1234567890abcdef12345678",
                    "channelId": "channel-n",
                    "timeout": 36000
                  },
                  "base": {
                    "portAddr": "0x1234567890abcdef1234567890abcdef12345678",
                    "channelId": "channel-n",
                    "timeout": 36000
                  }
                };
                config["sendUniversalPacket"] = {
                    "optimism": {
                        "portAddr": "0x1234567890abcdef1234567890abcdef12345678",
                        "channelId": "channel-x",
                        "timeout": 36000
                      },
                      "base": {
                        "portAddr": "0x1234567890abcdef1234567890abcdef12345678",
                        "channelId": "channel-y",
                        "timeout": 36000
                      }
                    };
        }

        // Update the universal channel values for new client
        config["sendUniversalPacket"]["optimism"]["channelId"] = 
            tempConfig.proofsEnabled ?
            ibcConfig["optimism"]["sim-client"]["universalChannel"] :
            ibcConfig["optimism"]["op-client"]["universalChannel"];
        config["sendUniversalPacket"]["base"]["channelId"] =
            tempConfig.proofsEnabled ?
            ibcConfig["base"]["sim-client"]["universalChannel"] :
            ibcConfig["base"]["op-client"]["universalChannel"];
        
        // Write a new backup object to the config
        config["backup"] = {
            "sendPacket": tempConfig["sendPacket"],
            "sendUniversalPacket": tempConfig["sendUniversalPacket"]
        };

        // Flip the proofsEnabled flag
        config["proofsEnabled"] = !config["proofsEnabled"];

        // Write the updated config back to the file
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        console.log('🆗 Config updated');
    } catch (error) {
        console.error(`❌ Failed to update config: ${error.message}`);
        process.exit(1);
    }
}

flipConfig();
