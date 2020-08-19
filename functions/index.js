const functions = require("firebase-functions");
const CoinGecko = require("coingecko-api");
const got = require("got");

const AYRSHARE_API_KEY = functions.config().ayrshare.key;

const CoinGeckoClient = new CoinGecko();

const CRONTAB_HOURLY = "0 * * * *";
const TIME_ZONE = "America/New_York";

const PLATFORMS = ["twitter", "facebook", "linkedin", "telegram"];

const coinMapping = new Map([
  ["bitcoin", "BTC"],
  ["ethereum", "ETH"],
  ["litecoin", "LTC"],
]);

let previous;	// Previous prices

/** Publish if large price movement */
const publishMovement = (coin, percent, diff) => {
  const json = {
    post: `${coinMapping.get(coin)} (${coin}) is moving. ${
      diff > 0 ? "Up" : "Down"
    } ${percent}% in the past hour.`,
    platforms: PLATFORMS,
  };

  return publish(json);
};

/** Publish the Crypto prices */
const publishPrices = (data) => {
  const keys = Object.keys(data);

  const formatNumber = (num) =>
    parseFloat(num)
      .toFixed(2)
      .replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,");

  const json = {
    post: `Hourly crypto prices:\n\n${keys
      .map(
        (coin) =>
          `${coinMapping.get(coin)}: $${formatNumber(
            data[coin].usd
          )} (${coin}) ${data[coin].diff}`
      )
      .join("\n")}\n\n${keys.map((coin) => `#${coin}`).join(" ")}`,
    platforms: PLATFORMS,
  };

  return publish(json);
};

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

/** Get the price change percentage */
const getChange = (data) => {
  // Deep Copy
  const prices = JSON.parse(JSON.stringify(data));

  const keys = Object.keys(prices);
  if (!previous) {
    keys.forEach((coin) => (prices[coin].diff = ""));
    previous = prices;

    return previous;
  }

  keys.forEach((coin) => {
    const previousVal = previous[coin].usd;
    const diff = prices[coin].usd - previousVal;
    const percent = Math.abs((diff / previousVal) * 100);

    if (percent >= 1) {
      publishMovement(coin, percent, diff);
    }

    const formattedPercent = parseFloat(percent).toFixed(2);
    prices[coin].diff =
      percent === 0 ? "" : `${diff >= 0 ? "🟢+" : "🔴-"}${formattedPercent}%`;
  });

  previous = prices;

  return previous;
};

/** Run every hour */
const runHourly = async () => {
  const crypto = await CoinGeckoClient.simple
    .price({
      ids: Array.from(coinMapping.keys()),
      vs_currencies: ["usd"],
    })
    .catch(console.error);

  const { data } = crypto;
  const processedData = getChange(data);

  return publishPrices(processedData);
};

exports.cryptoHourly = functions.pubsub
  .schedule(CRONTAB_HOURLY)
  .timeZone(TIME_ZONE)
  .onRun((context) => {
    return runHourly();
  });
