# Datapig XYZ Bot

This repository contains a bot designed to interact with the [Datapig API](https://app.datapig.xyz?ref=hj7dh9). 
The bot can generate random preferences, sign messages, generate analysis, and mint files to the blockchain. It runs every 24 hours to process wallets automatically.


## Prerequisite

Before you begin, ensure that you have met the following requirements:

- **Node.js**: Version 16 or higher.
  
- **npm**: Package manager to install dependencies.
  ```
  sudo apt install npm
  ```
- **Private keys** for the wallets you want to interact with.
  
- **Reference Codes** (optional but recommended for additional rewards) use ```hj7dh9```.
  
- **screen**
  ```
  sudo apt install screen
  ```

## Join My Telegram Channel

For more bots and tutorials you can join our Telegram channel

[**UbuntuForNodes**](https://t.me/ubuntufornodes)

also you can follow me on [X(iamshaho)](https://x.com/iamshaho)


## Installation

Follow these steps to set up the project on your local machine:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/TheShaho/datapig-xyz.git
   cd datapig-xyz
   ```
2. **Install Dependencies**:
  ```bash
  npm install
  ```

3. **Setup private_keys.txt**
   
Create a file named private_keys.txt in the root directory of the project. 
```bash
nano private_keys.txt
```


## Running Bot

Once you've completed the setup, you can run the bot with the following command:

```bash
screen -S datapig

node index.js
```

Ctl + A + D
