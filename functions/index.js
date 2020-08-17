const functions = require("firebase-functions");
const CoinGecko = require("coingecko-api");
const CoinGeckoClient = new CoinGecko();
const got = require("got");

const CRONTAB_HOURLY = "0 * * * *";
const TIME_ZONE = "America/New_York";
const AYRSHARE_API_KEY = functions.config().ayrshare.key;

exports.cryptoHourly = functions.pubsub
  .schedule(CRONTAB_HOURLY)
  .timeZone(TIME_ZONE)
  .onRun(async (context) => {
    const crypto = await CoinGeckoClient.simple.price({
      ids: ["bitcoin", "ethereum", "litecoin"],
      vs_currencies: ["usd"],
    });

    const { data } = crypto;
    const keys = Object.keys(data);

    const { body } = await got.post("https://app.ayrshare.com/api/post", {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AYRSHARE_API_KEY}`,
      },
      json: {
        post: `Hourly crypto prices:\n\n${keys
          .map((coin) => `${coin}: $${parseFloat(data[coin].usd).toFixed(2)}`)
          .join("\n")}`,
        platforms: ["twitter"],
      },
      responseType: "json",
    });
  });
