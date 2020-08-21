const functions = require("firebase-functions");
const CoinGecko = require("coingecko-api");
const got = require("got");

const AYRSHARE_API_KEY = functions.config().ayrshare.key;
const CoinGeckoClient = new CoinGecko();

const CRONTAB_HOURLY = "0 * * * *";
const CRONTAB_HALF_PAST = "30 * * * *";
const TIME_ZONE = "America/New_York";

const PLATFORMS = ["twitter", "facebook", "linkedin", "telegram"];

const coinStdMapping = new Map([
  ["bitcoin", { ticker: "BTC", name: "Bitcoin" }],
  ["ethereum", { ticker: "ETH", name: "Ethereum" }],
  ["litecoin", { ticker: "LTC", name: "Litecoin" }],
]);

const coinDefiMapping = new Map([
  ["maker", { ticker: "MKR", name: "Maker" }],
  ["ethlend", { ticker: "LEND", name: "Aave" }],
  ["curve-dao-token", { ticker: "CRV", name: "Curve Finance" }],
]);

const madeWith = "\nmade with @AyrShare";

let previousStd; // Previous standard prices
let previousDefi; // Previous DeFi prices

/** Publish to Ayrshare */
const publish = (json) => {
  return got
    .post("https://app.ayrshare.com/api/post", {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AYRSHARE_API_KEY}`,
      },
      json,
      responseType: "json",
    })
    .catch(console.error);
};

/** Publish if large (greater than 1%) price movement */
const publishMovement = (coinMapping, coin, percent, diff) => {
  const json = {
    post: `${coinMapping.get(coin).ticker} (${
      coinMapping.get(coin).name
    }) is moving. ${diff > 0 ? "Up 🟢 +" : "Down 🔴 -"} ${parseFloat(
      percent
    ).toFixed(2)}% in the past hour.\n${madeWith}`,
    platforms: PLATFORMS,
  };

  return publish(json);
};
// ---------------------------------------------------

/** Publish the Crypto prices */
const publishPrices = (coinMapping, hashtag, data) => {
  const keys = Object.keys(data);

  const formatNumber = (num) =>
    parseFloat(num)
      .toFixed(2)
      .replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,");

  const json = {
    post: `Hourly crypto prices:\n\n${keys
      .map(
        (coin) =>
          `${coinMapping.get(coin).ticker}: $${formatNumber(data[coin].usd)} (${
            coinMapping.get(coin).name
          }) ${data[coin].diff}`
      )
      .join("\n")}\n\n${keys
      .map((coin) => `#${coinMapping.get(coin).name.replace(/\s/g, "")}`)
      .join(" ")}${hashtag}${madeWith}`,
    platforms: PLATFORMS,
  };

  return publish(json);
};
// ---------------------------------------------------

/** Get the price change percentage */
const getChange = (coinMapping, previous, data) => {
  // Deep Copy
  const prices = JSON.parse(JSON.stringify(data));

  const keys = Object.keys(prices);
  if (!previous) {
    console.log("Previous not present");
    keys.forEach((coin) => (prices[coin].diff = ""));
    previous = prices;

    return previous;
  }

  keys.forEach((coin) => {
    const previousVal = previous[coin].usd;
    const diff = prices[coin].usd - previousVal;
    const percent = Math.abs((diff / previousVal) * 100);

    if (percent >= 1) {
      publishMovement(coinMapping, coin, percent, diff);
    }

    const formattedPercent = parseFloat(percent).toFixed(2);
    prices[coin].diff =
      percent === 0 ? "" : `${diff >= 0 ? "🟢 +" : "🔴 -"}${formattedPercent}%`;
  });

  previous = prices;

  return previous;
};
// ---------------------------------------------------

/** Run every hour or half hour */
const run = async (coinMapping, hashtag, previous) => {
  const crypto = await CoinGeckoClient.simple
    .price({
      ids: Array.from(coinMapping.keys()),
      vs_currencies: ["usd"],
    })
    .catch(console.error);

  const { data } = crypto;
  const processedData = getChange(coinMapping, previous, data);

  return publishPrices(coinMapping, hashtag, processedData);
};
// ---------------------------------------------------

/** Cloud Functions */

exports.cryptoHourly = functions.pubsub
  .schedule(CRONTAB_HOURLY)
  .timeZone(TIME_ZONE)
  .onRun((context) => {
    run(coinStdMapping, "", previousStd);
  });

exports.cryptoHalfPast = functions.pubsub
  .schedule(CRONTAB_HALF_PAST)
  .timeZone(TIME_ZONE)
  .onRun((context) => {
    return run(coinDefiMapping, " #DeFi", previousDefi);
  });

/*
  exports.test = functions.https.onRequest(async (req, res) => {
	run(coinDefiMapping, " #DeFi", previousDefi);
	return res.send("ok");
  });
*/
