# Firebase setup

From the Client Hub's Firebase project to a working Learning Hub. Every step runs in the terminal on Charlotte's Mac, from inside the repository folder, except the steps marked as browser steps. It follows the same process as the Client Hub (`efclienthub/docs/firebase-setup.md`).

## Where the Learning Hub lives

The Learning Hub shares the Client Hub's project, `ef-client-hub`, so 1 login works in both apps. Everything else is its own:

| Part | Client Hub | Learning Hub |
| --- | --- | --- |
| Firestore database | `clienthub` | `learninghub` |
| Hosting site | `executiveframe-clienthub` | `executiveframe-learninghub` |
| Storage bucket | `executiveframe-clienthub` | `executiveframe-learninghub` |
| Functions codebase | `clienthub` | `learning` |
| Address | clients.executiveframe.co.nz | app.executiveframe.co.nz |

Every deploy names its parts (`hosting:learning`, `storage:learning`, `functions:learning`, and the `learninghub` database in `firebase.json`), so a Learning Hub deploy never touches the Client Hub, and the reverse.

## 1. Install the tools (once per computer)

Already done for the Client Hub on this Mac. On a new computer:

```
brew install node@22 openjdk@21
brew install --cask google-cloud-sdk
echo 'export PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc
```

Then the repository:

```
cd ~
git clone https://github.com/charlotteprice-blip/eflearninghub.git
cd eflearninghub
source ~/.nvm/nvm.sh && nvm use 22
npm install
```

`npm install` also installs the Cloud Functions packages. Warnings about engines and deprecated packages are expected, as they were for the Client Hub.

## 2. Log in

The same logins as the Client Hub. If they are still current, these finish straight away.

```
npx firebase login
gcloud auth login
gcloud auth application-default login
gcloud config set project ef-client-hub
gcloud auth application-default set-quota-project ef-client-hub
```

If `npm run setup:check` says the Firebase CLI cannot list projects, run `npx firebase login --reauth`.

## 3. Create everything else

```
npm run setup:check
npm run setup
```

`setup` asks before each change. It switches on the Google services (most are already on from the Client Hub), creates the `learninghub` database in Sydney with backups and delete protection, creates and links the Hosting site and Storage bucket, registers the web app and writes `public/assets/js/firebase-config.js`, authorises the Learning Hub's sign in addresses, sets up Microsoft sign in, checks Google sign in, confirms the audit logs, gives the functions' service account the access it needs (build, Firestore, logs, reading the library bucket and signing download links), saves the Stripe key, adds `app.executiveframe.co.nz`, and lists who has broad access.

Run `npm run setup:check` again afterwards; every line should read done, apart from the domain, which waits for DNS.

Commit the web app settings it wrote:

```
git add public/assets/js/firebase-config.js
git commit -m "Add Firebase web app settings for the Learning Hub"
git push
```

**Microsoft sign in.** If the Azure CLI is installed and logged in (`brew install azure-cli`, `az login`), `setup` creates the Entra app registration itself and passes its secret straight to Firebase without showing it. Otherwise it lists the redirect addresses to enter in the Entra admin centre and asks for the client ID and secret (the secret is hidden as you type).

**Google sign in (browser step).** Firebase console, Authentication, Sign in method, Google, Enable. This creates the OAuth client. Then, in Google Cloud console, APIs and Services, Credentials, open the web client Firebase made and add these authorised redirect addresses:

```
https://executiveframe-learninghub.web.app/__/auth/handler
https://executiveframe-learninghub.firebaseapp.com/__/auth/handler
https://app.executiveframe.co.nz/__/auth/handler
```

**Stripe key.** The `secret` step runs `firebase functions:secrets:set STRIPE_SECRET_KEY`, which asks for the key itself, hidden. Use the restricted key from Sarah's Executive Frame Stripe account (step 4). To replace it later: `npm run secret`.

**Password rule (optional).** The Learning Hub's pages ask for 10 characters with a number and a symbol. Enforcing that for the shared login would apply to the Client Hub too, so it only runs when named: `npm run setup -- --only=passwordpolicy`.

## 4. Stripe

**Browser steps in Sarah's Executive Frame Stripe account** (never the Charlotte Price Consulting account; Stripe has no API for these):

```
Settings, Team: invite hello@charlotteprice.co.nz as Administrator
Developers, API keys, Create restricted key:
  Customers, Checkout Sessions, Subscriptions, Customer portal: write
  Prices, Products: read
Settings, Billing, Subscriptions and emails: receipts, trial ending reminder (3 days), failed payment emails on
Settings, Branding: Executive Frame name and logo, accent #2E4062
```

**Terminal**, with a full test secret key (`sk_test_...`, asked for at a hidden prompt), once Sarah confirms the amounts (cents, GST included):

```
npm run stripe -- prices --monthly 0000 --annual 0000 --partner-monthly 0000 --partner-annual 0000
npm run stripe -- portal
npm run stripe -- check
```

For an arm at its own price, add `--arm law --arm-monthly 0000 --arm-annual 0000` to `prices`.

## 5. Deploy

```
npm run deploy:rules
npm run deploy:functions
npm run deploy:hosting
```

The functions deploy runs the function tests first, and `deploy:hosting` runs the tests and the colour contrast check. The app is then live at https://executiveframe-learninghub.web.app.

If every function fails with "missing permission on the build service account", run `npm run setup -- --only=functionsaccess`, then `npm run deploy:functions` again. The Client Hub's setup has usually done this already, because both apps share the service account.

## 6. Check it end to end (test mode)

1. Open https://executiveframe-learninghub.web.app/join/?arm=law and create an account.
2. Choose Monthly and pay with Stripe's test card `4242 4242 4242 4242`, any future date, any 3 digits. Thank you should show the trial end date.
3. Open the viewer, work through the sample topic, and try the download (after uploading a test PDF, below).
4. On Account, open Manage billing and switch to Annual, then cancel; access should continue to the end of the period.
5. Add a test organisation and claim a place with its code from a second account.

```
npm run upload -- test-workbook.pdf all
npm run orgs -- add --id test-org --name "Test Org" --seats 2 --contract-end 2027-12-31
npm run orgs -- list
```

## 7. Security rules tests

```
npm run test:rules
```

Needs Java 21, as for the Client Hub. Checks that members read only their own record, nobody reads organisations, nothing is written from a browser, and the library bucket is closed.

## 8. Launch

```
npm run setup:check        prints the DNS records for app.executiveframe.co.nz
```

Add the records at the executiveframe.co.nz DNS host (browser step) and log the change in the Site Changes Log. Then repeat step 4 with live keys (`--live`), replace the secret with the live restricted key (`npm run secret`), and `npm run deploy:functions`. Finally, change `authDomain` in `public/assets/js/firebase-config.js` to `app.executiveframe.co.nz` and `npm run deploy:hosting`.

## Day to day

```
npm run tasks              every command, grouped
git pull
npm run check
npm run deploy:hosting     pages and topic content
npm run deploy:functions
npm run logs
npm run orgs -- list
npm run worklog            today's commits as a Notion Worklog entry
```
