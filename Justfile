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
# Usage: just set-contracts [chain] [contract-type] [universal]
set-contracts CHAIN CONTRACT_TYPE UNIVERSAL='true':
    echo "Updating config.json with contract type..."
    node scripts/_set-contracts-config.js {{CHAIN}} {{CONTRACT_TYPE}} {{UNIVERSAL}}

# Deploy the contracts in the /contracts folder using Hardhat and updating the config.json file
# The source and destination arguments are REQUIRED;
# The universal argument is optional; if not provided, it defaults to "true".
# Usage: just deploy [source] [destination]
deploy SOURCE DESTINATION:
        echo "Deploying contracts with Hardhat..."
        node scripts/_deploy-config.js {{SOURCE}} {{DESTINATION}}

# Run the sanity check script to verify that configuration (.env) files match with deployed contracts' stored values
# Usage: just sanity-check
sanity-check:
    echo "Running sanity check..."
    node scripts/_sanity-check.js

# Update the dispatcher or universal channel handler address on the IBC application, with that from the .env file
# Usage: just update-vibc [chain]
update-vibc CHAIN:
  echo "Updating the dispatcher or universal channel handler address..."
  npx hardhat run scripts/_update-vibc-address.js --network {{CHAIN}}

# Create a channel by triggering a channel handshake from the source and with parameters found in the config.json file
# Usage: just create-channel
create-channel:
    echo "Attempting to create a channel with the values from the config..."
    node scripts/_create-channel-config.js

# Send a packet over the universal channel or a custom channel as defined in the config.json file
# The source argument is REQUIRED;
# The universal argument is optional; if not provided, it defaults to "true".
# Usage: just send-packet [source] [universal]
send-packet SOURCE:
    echo "Sending a packet with the values from the config..."
    node scripts/_send-packet-config.js {{SOURCE}}

# Switch between the sim client and the client with proofs
# Usage: just switch-client
switch-client:
    echo "Switching between sim client and client with proofs..."
    npx hardhat run scripts/_update-vibc-address.js --network optimism
    npx hardhat run scripts/_update-vibc-address.js --network base
    node scripts/_switch-clients.js

# Run the full E2E flow by setting the contracts, deploying them, creating a channel, and sending a packet
# Usage: just do-it
do-it:
    echo "Running the full E2E flow..."
    just set-contracts optimism XCounter false && just set-contracts base XCounter false
    just deploy optimism base
    just sanity-check
    just create-channel
    just send-packet optimism
    echo "You've done it!"

# Clean up the environment by removing the artifacts and cache folders and running the forge clean command
# Usage: just clean
clean:
    echo "Cleaning up environment..."
    rm -rf artifacts cache
    forge clean

# Fully clean the environment by removing the artifacts, the dependencies, and cache folders and running the forge clean-all command
# Usage: just clean-all
clean-all:
    echo "Cleaning up environment..."
    rm -rf artifacts cache
    forge clean
    rm -rf node_modules
