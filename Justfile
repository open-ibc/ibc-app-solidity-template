# Install dependencies
install:
    echo "Installing dependencies"
    npm install
    forge install

# Compile contracts using the specified compiler or default to Hardhat
# The compiler argument is optional; if not provided, it defaults to "hardhat".
# Usage: just compile [compiler]
compile COMPILER='hardhat':
    #!/usr/bin/env sh
    if test "{{COMPILER}}" = "hardhat"; then
        echo "Compiling contracts with Hardhat..."
        npx hardhat compile
    elif test "{{COMPILER}}" = "foundry"; then
        echo "Compiling contracts with Foundry..."
        forge build
    else
        echo "Unknown compiler: {{COMPILER}}"
        exit 1
    fi

# Update the config.json file with the contract type for a specified chain/rollup
# Usage: just set-contracts [chain] [contract_type]
set-contracts CHAIN CONTRACT_TYPE:
    echo "Updating config.json with contract type..."
    node scripts/set-contracts-config.js {{CHAIN}} {{CONTRACT_TYPE}}

# Deploy the contracts in the /contracts folder using Hardhat and updating the config.json file
# The source and destination arguments are REQUIRED;
# The universal argument is optional; if not provided, it defaults to "true".
# Usage: just deploy [source] [destination] [universal]
deploy SOURCE DESTINATION UNIVERSAL='true':
    #!/usr/bin/env sh
    if test "{{UNIVERSAL}}" = "true"; then
        echo "Deploying contracts with Hardhat..."
        node scripts/deploy-config.js {{SOURCE}} {{DESTINATION}} true
    elif test "{{UNIVERSAL}}" = "false"; then
        echo "Deploying contracts with Hardhat..."
        node scripts/deploy-config.js {{SOURCE}} {{DESTINATION}} false
    else
        echo "Unknown universal flag: {{UNIVERSAL}}"
        exit 1
    fi

# Create a channel by triggering a channel handshake from the source and with parameters found in the config.json file
# Usage: just create-channel
create-channel:
    echo "Attempting to create a channel with the values from the config..."
    node scripts/create-channel-config.js

# Send a packet over the universal channel or a custom channel as defined in the config.json file
# The source argument is REQUIRED;
# The universal argument is optional; if not provided, it defaults to "true".
# Usage: just send-packet [source] [universal]
send-packet SOURCE UNIVERSAL='true':
    #!/usr/bin/env sh
    if test "{{UNIVERSAL}}" = "true"; then
        echo "Attempting to send a packet over the universal channel as defined in the config..."
        npx hardhat run scripts/send-universal-packet.js --network {{SOURCE}}
    elif test "{{UNIVERSAL}}" = "false"; then
        echo "Attempting to send a packet over a custom channel as defined in the config..."
        npx hardhat run scripts/send-packet.js --network {{SOURCE}}
    else
        echo "Unknown universal flag: {{UNIVERSAL}}"
        exit 1
    fi

# Clean up the environment by removing the artifacts and cache folders and running the forge clean command
clean:
    echo "Cleaning up environment..."
    rm -rf artifacts cache
    forge clean