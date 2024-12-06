const Web3 = require('web3');
const axios = require('axios');
const fs = require('fs');
const chalk = require('chalk');

// Configuration
const RPC = 'https://rpc.moksha.vana.org';
const web3 = new Web3(new Web3.providers.HttpProvider(RPC));
const PRIVATE_KEYS_FILE = 'private_keys.txt';
const ROUTER_ADDRESS = '0xCFd016891E654869BfEd5D9E9bb76559dF593dbc';
const ROUTER_ABI = [
    {
        "name": "addFile",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
        "inputs": [
            { "internalType": "string", "name": "url", "type": "string" },
            { "internalType": "string", "name": "encryptedKey", "type": "string" }
        ]
    }
];

// Helper to read private keys and refCodes from file
function readPrivateKeys(file) {
    return fs.readFileSync(file, 'utf8')
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
            const [privateKey, refCode] = line.split(',');
            return { privateKey: privateKey.trim(), refCode: refCode?.trim() };
        });
}

// Function to get a message for the address
async function getMessage(address) {
    try {
        const response = await axios.post('https://api.datapig.xyz/api/get-message', { address });
        return response.data.message;
    } catch (error) {
        console.error('Error getting message:', error.response?.data || error.message);
    }
}

// Function to sign a message
async function signMessage(privateKey, message) {
    try {
        const account = web3.eth.accounts.privateKeyToAccount(privateKey);
        const signature = account.sign(message);
        return { signature: signature.signature, address: account.address };
    } catch (error) {
        console.error('Error signing message:', error.message);
    }
}

// Function to login
async function login(address, message, signature) {
    try {
        const response = await axios.post('https://api.datapig.xyz/api/login', { signature, address, message });
        return response.data.token;
    } catch (error) {
        console.error('Error logging in:', error.response?.data || error.message);
    }
}

// Function to get tokens
async function getTokens(token) {
    try {
        const response = await axios.get('https://api.datapig.xyz/api/tokens', {
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.data;
    } catch (error) {
        console.error('Error getting tokens:', error.response?.data || error.message);
    }
}

// Function to generate analysis
async function generateAnalysis(token, address, preferences, signature, refCode) {
    try {
        const response = await axios.post(
            'https://api.datapig.xyz/api/submit',
            { address, preferences, signature, refCode },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return response.data;
    } catch (error) {
        // Check if the response status code is 429 (Too Many Requests)
        if (error.response?.status === 429) {
            console.log('Daily Limit Reached. Moving to the next wallet.');
            return null;  // Return null to indicate failure and move to the next wallet
        }
        console.error('Error generating analysis:', error.response?.data || error.message);
    }
}


// Function to confirm the transaction hash
async function confirmHash(token, address, confirmedTxHash) {
    try {
        const response = await axios.post(
            'https://api.datapig.xyz/api/invitedcode',
            { address, confirmedTxHash },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        //console.log('Transaction hash confirmed:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error confirming transaction hash:', error.response?.data || error.message);
    }
}

// Function to mint file (with retry mechanism)
async function mintFile(privateKey, url, encryptedKey, retries = 3) {
    try {
        const account = web3.eth.accounts.privateKeyToAccount(privateKey);
        const contract = new web3.eth.Contract(ROUTER_ABI, ROUTER_ADDRESS);

        // Prepare the full IPFS URL
        const fullUrl = `ipfs://${url}`;

        // Estimate gas for the addFile method
        const gasEstimate = await contract.methods.addFile(fullUrl, encryptedKey).estimateGas({ from: account.address });

        // Get the current gas price
        const gasPrice = await web3.eth.getGasPrice();

        // Create transaction data
        const data = contract.methods.addFile(fullUrl, encryptedKey).encodeABI();
        const transaction = {
            to: ROUTER_ADDRESS,
            data,
            gas: gasEstimate,
            gasPrice: gasPrice, // Include the current gas price
        };

        // Sign the transaction
        const signedTransaction = await web3.eth.accounts.signTransaction(transaction, privateKey);

        // Send the signed transaction
        const receipt = await web3.eth.sendSignedTransaction(signedTransaction.rawTransaction);
        console.log('Mintfile transaction successful: Transaction Hash:', receipt.transactionHash);

        // Return the transaction hash for confirmation
        return receipt.transactionHash;
    } catch (error) {
        console.error(`Error in mintFile (Attempt ${4 - retries}):`, error.message);

        // Retry if we have remaining attempts
        if (retries > 1) {
            console.log(`Retrying in 1 minute...`);
            await new Promise(resolve => setTimeout(resolve, 60000)); // Wait for 1 minute before retrying
            return mintFile(privateKey, url, encryptedKey, retries - 1); // Retry with reduced retries
        } else {
            console.error('All retry attempts failed.');
            throw new Error('Failed to mint file after 3 attempts');
        }
    }
}

// Generate random preferences
function generateRandomPreferences(tokens) {
    const categories = [
        'Layer 1', 'Governance', 'Launch Pad', 'GameFi & Metaverse',
        'NFT & Collectibles', 'Layer 2 & Scaling', 'Infrastructure',
        'Meme & Social', 'DeFi', 'DePIN', 'Others', 'AI', 'Liquid Staking', 'RWA', 'Murad Picks'
    ];
    const randomCategories = categories.sort(() => 0.5 - Math.random()).slice(0, 3);

    // Filter tokens that match the random categories
    const matchedTokens = tokens.filter(token => 
        token.categories.some(category => randomCategories.includes(category))
    );

    // Select 13 or 14 distinct tokens randomly from matched tokens
    const selectedTokens = matchedTokens
        .sort(() => 0.5 - Math.random())
        .slice(0, Math.random() < 0.5 ? 13 : 14);

    // Create likes payload with true/false for selected tokens
    const likes = selectedTokens.reduce((acc, token) => {
        acc[token.id] = Math.random() < 0.5; // Random true/false
        return acc;
    }, {});

    return { categories: randomCategories, likes };
}

// Function to print header
function printHeader() {
    const line = "=".repeat(50);
    const title = "Auto Generate Analysis Data Pig XYZ";
    const createdBy = "Bot edited by: https://t.me/UbuntuForNodes";

    const totalWidth = 50;
    const titlePadding = Math.floor((totalWidth - title.length) / 2);
    const createdByPadding = Math.floor((totalWidth - createdBy.length) / 2);

    const centeredTitle = title.padStart(titlePadding + title.length).padEnd(totalWidth);
    const centeredCreatedBy = createdBy.padStart(createdByPadding + createdBy.length).padEnd(totalWidth);

    console.log(chalk.cyan.bold(line));
    console.log(chalk.cyan.bold(centeredTitle));
    console.log(chalk.green(centeredCreatedBy));
    console.log(chalk.cyan.bold(line));
}

// Main execution
async function mainExecution() {
	printHeader();
    const privateKeyData = readPrivateKeys(PRIVATE_KEYS_FILE);

    for (const { privateKey, refCode } of privateKeyData) {
        const account = web3.eth.accounts.privateKeyToAccount(privateKey);
        const address = account.address;

        console.log(chalk.cyan(`Using address: ${address}`));

        // Loop the process 5 times for the current wallet
        for (let loopCount = 0; loopCount < 5; loopCount++) {
            console.log(chalk.yellow(`Starting loop ${loopCount + 1} of 5 for wallet ${address}`));

            try {
                // Get message
                const message = await getMessage(address);
                if (!message) {
                    console.log(chalk.red('Error: No message received. Moving to next wallet.'));
                    break;  // If no message is returned, break to next wallet
                }

                // Custom log message for nonce
                console.log(chalk.green('Get nonce message success'));

                // Sign message
                const { signature } = await signMessage(privateKey, message);
                if (!signature) {
                    console.log(chalk.red('Error: No signature generated. Moving to next wallet.'));
                    break;  // If no signature is returned, break to next wallet
                }

                // Custom log message for signature
                console.log(chalk.green('Get signature success'));

                // Login
                const token = await login(address, message, signature);
                if (!token) {
                    console.log(chalk.red('Error: Login failed. Moving to next wallet.'));
                    break;  // If no token is returned, break to next wallet
                }

                // Print success message for fetching tokens
                console.log(chalk.green('Get token success'));

                // Get tokens
                const tokens = await getTokens(token);
                if (!tokens) {
                    console.log(chalk.red('Error: No tokens received. Moving to next wallet.'));
                    break;  // If no tokens are returned, break to next wallet
                }

                // Print success message for generating preferences
                const preferences = generateRandomPreferences(tokens);
                console.log(chalk.green('Generated preferences successfully'));

                // Sign additional message for analysis
                const additionalMessage = "Please sign to retrieve your VANA encryption key";
                const { signature: analysisSignature } = await signMessage(privateKey, additionalMessage);

                if (!analysisSignature) {
                    console.log(chalk.red('Error: No analysis signature generated. Moving to next wallet.'));
                    break;  // If no signature for analysis, break to next wallet
                }

                // Custom log message for analysis signature
                console.log(chalk.green('Get analysis signature success'));

                // Generate analysis
                const analysis = await generateAnalysis(token, address, preferences, analysisSignature, refCode);
                if (!analysis) {
                    break;
                }

                // Custom log message for analysis response
                console.log(chalk.green('Generate analysis success'));

                // Mint file using ipfs_hash and encryptedKey
                const { ipfs_hash: url, encryptedKey } = analysis;
                const txHash = await mintFile(privateKey, url, encryptedKey); // mintFile with retry logic

                const confirmedHashResponse = await confirmHash(token, address, txHash);
                console.log(chalk.green('Confirmed transaction hash: '), confirmedHashResponse);

            } catch (error) {
                console.error(chalk.red(`Error in loop ${loopCount + 1}:`), chalk.red(error.message));
                // If an error occurs in any loop, break to next wallet
                break;
            }
        }

        // After 5 full loops, move to the next wallet
        console.log(chalk.cyan(`Completed 5 loops for wallet ${address}. Moving to the next wallet.`));
        
        // Separator for each wallet
        console.log(chalk.magenta('--- End of wallet process ---\n'));
		
    }
	console.log(chalk.magenta('--- Wait for next 24 hours... ---\n'));
};

// Run the main execution every 24 hours
setInterval(mainExecution, 86400000); // 86400000 ms = 24 hours

// Run the first execution immediately
mainExecution();
