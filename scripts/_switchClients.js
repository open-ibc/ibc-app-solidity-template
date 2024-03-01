const { exec } = require("child_process");
const fs = require('fs');
const path = require('path');
const configRelativePath = process.env.CONFIG_PATH || 'config.json';
const configPath = path.join(__dirname, '..' , configRelativePath);

// Function to update config.json
function flipConfig() {
    try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        const tempConfig = {...config};
    
        // Update the config object
        config["proofsEnabled"] = !tempConfig["proofsEnabled"];

        const source = tempConfig["createChannel"]["srcChain"];
        const destination = tempConfig["createChannel"]["dstChain"];
        config["createChannel"]["srcAddr"] = config["backup"]["sendPacket"][`${source}`]["portAddr"];
        config["createChannel"]["dstAddr"] = config["backup"]["sendPacket"][`${destination}`]["portAddr"];

        config["sendPacket"] = config["backup"]["sendPacket"];
        config["sendUniversalPacket"] = config["backup"]["sendUniversalPacket"];

        // Write a new backup object to the config
        config["backup"] = {
            "sendPacket": tempConfig["sendPacket"],
            "sendUniversalPacket": tempConfig["sendUniversalPacket"]
        };
    
        // Write the updated config back to the file
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    } catch (error) {
        console.error(`Failed to update config: ${error.message}`);
        process.exit(1);
    }
}

function updateVibc(network, universal) {
    const updateScript = universal ? "_updateDispatcher.js" : "_updateUcHandler.js";
    exec(`npx hardhat run scripts/${updateScript} --network ${network}`, (error, stdout, stderr) => {
        if (error) {
          console.error(`exec error: ${error}`);
          return;
        }

        const output = stdout.trim();
        let match;
        if (!universal) {
            match = output.match(/Dispatcher updated to (\S+)/);
            if (match) {
                const dispatcher = match[1];
                console.log(`Updated Dispatcher on network ${network} to ${dispatcher}`);
            } else {
                console.error(`Failed to update Dispatcher on network ${network}`);
            }
        } else {        
            match = output.match(/Universal channel handler updated to (\S+)/);
            if (match) {
                const ucHandler = match[1];
                console.log(`Updated Handler on network ${network} to ${ucHandler}`);
            } else {
                console.error(`Failed to update universal channel handler on network ${network}`);
            }
        }
      
});
}
function main() {
    updateVibc("optimism", false);
    updateVibc("base", false);
    updateVibc("optimism", true);
    updateVibc("base", true);
    flipConfig();
}

main();
