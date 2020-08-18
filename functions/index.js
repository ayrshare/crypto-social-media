const functions = require("firebase-functions");
const CoinGecko = require("coingecko-api");
const got = require("got");

const CoinGeckoClient = new CoinGecko();

const CRONTAB_HOURLY = "0 * * * *";
const TIME_ZONE = "America/New_York";
const AYRSHARE_API_KEY = functions.config().ayrshare.key;

let previous;

/**
 *	Get the price change percentage
 */ 
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
    const percent = parseFloat(Math.abs((diff / previousVal) * 100)).toFixed(2);

    prices[coin].diff = `${diff >= 0 ? "⬆️" : "⬇️"}${percent}%`;
  });

  previous = prices;

  return previous;
};

const formatNumber = (num) =>
  parseFloat(num)
    .toFixed(2)
    .replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,");

const publish = (data) => {
  const keys = Object.keys(data);
  const json = {
    post: `Hourly crypto prices:\n\n${keys
      .map(
        (coin) => `${coin}: $${formatNumber(data[coin].usd)}  ${data[coin].diff}`
      )
      .join("\n")}`,
    platforms: ["twitter", "facebook", "linkedin", "telegram"],
  };

  // Post to Ayrshare
  return got.post("https://app.ayrshare.com/api/post", {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${AYRSHARE_API_KEY}`,
    },
    json,
    responseType: "json",
  });
};

const runHourly = async () => {
  const crypto = await CoinGeckoClient.simple.price({
    ids: ["bitcoin", "ethereum", "litecoin"],
    vs_currencies: ["usd"],
  });

  const { data } = crypto;
  const processedData = getChange(data);

  return publish(processedData);
};

exports.cryptoHourly = functions.pubsub
  .schedule(CRONTAB_HOURLY)
  .timeZone(TIME_ZONE)
  .onRun((context) => {
    return runHourly();
  });
