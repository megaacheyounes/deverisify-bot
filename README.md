# Uniswap Matching Bot

## A market-making bot which reads prices on Uniswap and places orders on both sides of the order-book accordingly

This simple Node.js bot is for [DeversiFi](https://www.deversifi.com). This bot aims to simply keep orders on the bid and ask on any specified market, at prices determined by Uniswap, in order to profit from the spread.

This bot allows high speed-trading on a completely non-custodial exchange.

## Instructions

1. Create a new Ethereum wallet and fund with ETH
2. `git clone https://github.com/megaacheyounes/deverisify-bot.git`
3. rename `config.example.js` to `config.js`, and add the following information:
    1. Get an Alchemy URL (with API KEY) and add it to the file: [here](https://github.com/megaacheyounes/deverisify-bot/blob/main/config.example.js#L5)
    2. Add your Ethereum wallet private key (without prefix 0x): [here](https://github.com/megaacheyounes/deverisify-bot/blob/main/config.example.js#L3)
    3. Set the market pair you want to trade (default DAI/ETH) [here](https://github.com/megaacheyounes/deverisify-bot/blob/main/config.example.js#L4)

Once you fill `config.js`, execute these commands in order:  

1. install libraries: `npm install`
2. registers and deposits your ETH to the exchange: `node setup.js`
3. starts the bot: `node index.js`

## Manual registration

if setup script (registration) fails, you can use a chromium browser, navigate to https://app.deversifi.com/trade, link your metamask wallet then deposit your ETH manually on the exchange, this way you can skip running the setup script.

## Other information

This bot relies on Uniswap SDK for getting prices. A simple extension to this bot could be used to arbitrage between DeversiFi and Uniswap.
