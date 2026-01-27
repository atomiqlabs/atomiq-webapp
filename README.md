# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Installation
Install node modules with `npm install`

**NOTE:** If it fails try it with --force param `npm install --force`

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)

# Citrea swap page

## Option 3: atomiq.exchange (Any amount and lightning network)

For deposits less than 10 BTC or deposits via the Bitcoin Lightning network use [atomiq.exchange](https://app.atomiq.exchange/?tokenOut=CITREA:0x0000000000000000000000000000000000000000)

**Steps:**

1. Go to [Bridge Hub]() and select **Bitcoin**
2. Select **atomiq.exchange** as the provider, which will redirect you to [app.atomiq.exchange](https://app.atomiq.exchange/?tokenOut=CITREA:0x0000000000000000000000000000000000000000)
3. **Bitcoin on-chain** is pre-selected as the source, if you wish to swap from **Bitcoin Lightning Network**, select the **Bitcoin (lightning L2)** asset in the **You pay** section
4. Enter the amount you want to bridge (you can specify either input or output amounts)
5. Connect your **Citrea** wallet or type in the destination **Citrea** address
6. Connect your **Bitcoin** wallet (e.g. **UniSat**, **Xverse** or **Magic Eden**), not required for swap from **Bitcoin Lightning Network**
7. Click **Initiate swap** and confirm the transaction in your **Bitcoin** wallet, or send over the funds to the presented lightning network invoice (in case of **Bitcoin Lightning Network**)
8. The swap settles automatically after the bitcoin transaction gets confirmed (2 confirmations take on average 20 minutes), this is instant for **Bitcoin Lightning Network**
