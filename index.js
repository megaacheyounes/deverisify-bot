const DVF = require("./dvf");
const _ = require("lodash");
const { splitSymbol, prepareAmount } = require("dvf-utils");
const { AlchemyProvider } = require("@ethersproject/providers");
const { PAIR, ALCHEMY_URL, PRIVATE_KEY } = require("./config");
const {
	ChainId,
	Token,
	WETH,
	Fetcher,
	Route,
	Trade,
	TokenAmount,
	TradeType,
} = require("@uniswap/sdk");

let dvf;

const provider = new AlchemyProvider(null, ALCHEMY_URL.split("/v2/")[1]);

let lastBidRoute, lastAskRoute, lastMidPrice;

let tokenQuote;
let tokenBase;

let quote;
let base; //usually ETH

let starkPrivKey;
onStartUp();

let pair, routeBuy, routeSell, buySide, sellSide, midPrice;

async function marketMake() {
	const marketMakeImpl = async () => {
		pair = await Fetcher.fetchPairData(tokenQuote, tokenBase, provider);
		routeBuy = new Route([pair], tokenBase);
		routeSell = new Route([pair], tokenQuote);
		midPrice = routeBuy.midPrice.invert().toSignificant(4);
		console.log("midPrice", midPrice);
		const haveOpenOrders = await checkIfOpenOrders();
		if (midPrice !== lastMidPrice || !haveOpenOrders) {
			lastMidPrice = midPrice;
			lastBidRoute = routeSell;
			lastAskRoute = routeBuy;
			replaceOrders();
		}
	};

	marketMakeImpl();

	setInterval(marketMakeImpl, 3 * 60 * 1000); //run every 3 minutes (180,000 milliseconds)
}

async function onStartUp() {
	[quote, base] = splitSymbol(PAIR);

	dvf = await DVF();
	await cancelOpenOrders();

	await syncBalances();
	console.log(
		`Starting balances: ${balanceQuote} ${quote} , ${balanceBase} ${base}`
	);
	await defineUniswapTokens();

	// const userConfig = await dvf.getUserConfig()
	// starkPrivKey = userConfig.starkKeyHex

	// const keyPair = await dvf.stark.createKeyPair(PRIVATE_KEY);
	// starkPrivKey = keyPair.starkPrivateKey;

	// starkPrivKey = dvf.stark.createPrivateKey();

	// starkPrivKey = crypto.randomBytes(31).toString('hex')

	starkPrivKey = PRIVATE_KEY;
	console.log("using starkPrivKey", starkPrivKey);

	marketMake();
}

// Trading Functions

let balanceQuote;
let balanceBase;

async function cancelOpenOrders() {
	const orders = await dvf.getOrders();
	console.log(`will cancel ${orders.length} orders`);
	orders.forEach((o) => {
		dvf.cancelOrder(o._id);
	});
}

async function checkIfOpenOrders() {
	const orders = await dvf.getOrders();
	return orders.length > 0;
}

async function syncBalances() {
	const balances = _.chain(await dvf.getBalance())
		.keyBy("token")
		.mapValues("available")
		.value();
	balanceQuote = dvf.token.fromQuantizedAmount(quote, balances[quote]);
	balanceBase = dvf.token.fromQuantizedAmount(base, balances[base]);
	balanceQuote = balanceQuote === "NaN" ? 0 : balanceQuote;
	balanceBase = balanceBase === "NaN" ? 0 : balanceBase;
}

async function replaceOrders() {
	cancelOpenOrders();
	syncBalances();
	placeOrder(-balanceQuote / 5);
	placeOrder(balanceBase / (lastMidPrice * 5));
}

async function placeOrder(amount) {
	amount = prepareAmount(amount, 3);
	if (amount === "0") return;

	let price;
	if (amount > 0) {
		const buyAmountWei = dvf.token.toBaseUnitAmount(quote, 1);
		buySide = new Trade(
			lastBidRoute,
			new TokenAmount(tokenQuote, buyAmountWei),
			TradeType.EXACT_INPUT
		);
		price = buySide.executionPrice.toSignificant(6);
		console.log(
			`Place order ==> buy ${amount} ${quote} at: ${price} ${base}`
		);
	} else {
		const sellAmountWei = dvf.token.toBaseUnitAmount(base, 1);
		sellSide = new Trade(
			lastAskRoute,
			new TokenAmount(tokenBase, sellAmountWei),
			TradeType.EXACT_INPUT
		);
		price = sellSide.executionPrice.invert().toSignificant(6);

		console.log(
			`Place order ==> sell ${amount} ${base} at: ${price} ${quote}`
		);
	}
	try {
		if (!price) throw "price is undefined";

		await dvf.submitOrder({
			symbol: PAIR,
			amount,
			price,
			starkPrivateKey: starkPrivKey,
		});
	} catch (e) {
		const error = e.error || e;
		console.warn(`X ==> Trade not completed:`, error);
	}
}

async function defineUniswapTokens() {
	const [quote, base] = splitSymbol(PAIR);
	const config = await dvf.getConfig();
	tokenQuote =
		quote === "ETH"
			? WETH[ChainId.MAINNET]
			: new Token(
					ChainId.MAINNET,
					config.tokenRegistry[quote].tokenAddress,
					config.tokenRegistry[quote].decimals
			  );
	tokenBase =
		base === "ETH"
			? WETH[ChainId.MAINNET]
			: new Token(
					ChainId.MAINNET,
					config.tokenRegistry[base].tokenAddress,
					config.tokenRegistry[base].decimals
			  );
}
