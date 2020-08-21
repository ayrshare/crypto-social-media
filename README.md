# crypto-social-media

Crypto Social Media publishes hourly to popular Cryptocurrency and DeFi (Decentralized Finance) prices to social networks such as Twitter, Facebook, LinkedIn, Telegram, and Reddit. You can use this example to setup any event or dynamic content publishing from your backend server.

The system uses Coin Gecko to obtain the latest prices, determines the percent change since last post, formats the data, and publishes to social media networks using Ayrshare. Everything runs on Firebase using the cloud function scheduler.

You can see the live Twitter example at [@CryptoSocialM](https://twitter.com/CryptoSocialM)

## Dependencies

- [Ayrshare](https://www.ayrshare.com) - API to publish to all social networks with one call
- [Coin Gecko](https://www.coingecko.com/en/api) - get latest coin prices

## Optional

- [Firebase](https://www.firebase.com) - serverless cloud function and hourly cron job. You can use any of system such as Digital Ocean or Netlify.

## Set Up

1. Clone the repository and run **npm install**.
2. Install [Firebase CLI](https://firebase.google.com/docs/cli) and **init** in the directory. You are free to use another system such as Netlify or Heroku.
3. Register with [Ayrshare](https://www.ayrshare.com), enable your social media accounts, and get your API key.
4. In index.js set **AYRSHARE_API_KEY** to your key (or set the Firebase [env variable](https://firebase.google.com/docs/functions/config-env)).
5. Run locally to test and deploy to a production environment such as Firebase.

## Enhancement

Firebase Cloud Functions will unload out of memory and reload at certain points. We are saving the previous prices in a simple global variable, so when the a reload occurs, we lose the data. An enhancement would be to store the previous value in Firestore.

## More Info

[Article on Using Crypto Social Media](https://www.ayrshare.com/automatically-publish-cryptocurrency-prices-social-media-networks/)
