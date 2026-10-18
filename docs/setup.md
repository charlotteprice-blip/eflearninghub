# Setting up the Learning Hub from the terminal

Everything that has a command line route runs through `./tasks` in the repository folder. Run `./tasks help` for the full list. Each task checks for the tools it needs, says how to install anything missing, asks before anything that cannot be undone, and can be run again safely.

Secrets (the Stripe key, the Microsoft and Google client secrets) are typed at a hidden prompt and passed straight to the command that stores them. They are never written to a file, shown on screen or kept in shell history.

## Before you start

1. Install the tools: Node 22 (`brew install node@22`), the Google Cloud CLI (`brew install --cask google-cloud-sdk`), and, for Microsoft sign in, the Azure CLI (`brew install azure-cli`). The Firebase CLI runs through `npx` if it is not installed.
2. `./tasks doctor` shows what is installed and which Google account is signed in.
3. **By hand, once:** a Google Cloud billing account with Sarah's card, at console.cloud.google.com/billing. Card details cannot be entered from a terminal. Note its ID (like `0123AB-456CDE-789FGH`).

## Google and Firebase, in order

```
./tasks login                         # sign in as Sarah's Workspace account, or an account with Owner access
EF_ORG=<org id> ./tasks firebase:project   # creates executiveframe-app inside Sarah's Workspace (gcloud organizations list); asks first
./tasks firebase:owner                # Charlotte as Owner (falls back to Editor and Firebase Admin if Google requires a console invitation)
./tasks firebase:billing <billing id> # Blaze plan and a NZ$10 monthly budget alert
./tasks firebase:apis
./tasks firebase:firestore            # (default) database, australia-southeast1
./tasks firebase:storage              # default bucket, australia-southeast1
./tasks firebase:webapp
./tasks firebase:signing              # lets the functions sign download links
./tasks microsoft:app                 # Entra app registration; prints the client ID and a secret once
./tasks firebase:auth                 # email and password, password policy, authorised domain, Microsoft and Google sign in
./tasks firebase:secret               # paste the restricted Stripe test key (see below)
./tasks deploy
```

`./tasks firebase:all <billing id>` runs the first nine in one go.

**By hand, once, if `firebase:auth` asks:** Firebase console, Authentication, Get started. A brand new project sometimes needs this single click before its sign-in settings can be changed from the terminal. Then rerun `./tasks firebase:auth`.

**Google sign in:** `firebase:auth` needs an OAuth web client ID and secret. The quickest route is the Firebase console, Authentication, Sign-in method, Google, Enable, which creates them for you; after that nothing more is needed.

## Stripe (Sarah's Executive Frame account, never the Charlotte Price Consulting account)

**By hand, once, in the Stripe dashboard** (Stripe offers no API for these):

1. Settings, Team: invite hello@charlotteprice.co.nz as Administrator.
2. Developers, API keys, Create restricted key: Customers write, Checkout Sessions write, Subscriptions write, Customer portal write, Prices read, Products read. This key goes into `./tasks firebase:secret`.
3. Settings, Billing, Subscriptions and emails: receipts, the trial ending reminder (3 days before) and failed payment emails on.
4. Settings, Branding: Executive Frame name and logo, accent `#2E4062`.

**Then in the terminal**, with a full test secret key (`sk_test_...`), once Sarah has confirmed the amounts (in cents, GST included):

```
./tasks stripe:prices --monthly 0000 --annual 0000 --partner-monthly 0000 --partner-annual 0000
./tasks stripe:portal     # cancel at period end, card updates, monthly and annual switching, invoices
./tasks stripe:check      # confirms every price and portal setting the app relies on
```

For one arm at its own price, add `--arm law --arm-monthly 0000 --arm-annual 0000` to `stripe:prices`. GST: if Executive Frame is registered, add the registration in Stripe Tax and set `AUTOMATIC_TAX = true` in `functions/core.js`.

## Launch

```
./tasks firebase:domain   # connects app.executiveframe.co.nz and prints the DNS records
```

**By hand:** add the printed DNS records wherever the executiveframe.co.nz DNS is managed. Then repeat the Stripe steps with live keys (`--live`), update the secret with the live restricted key, and `./tasks deploy:functions`.

## Day to day

```
./tasks org:add --id wynn-williams --name "Wynn Williams" --domains wynnwilliams.co.nz --seats 20 --contract-end 2027-06-30
./tasks upload workbook.pdf law       # puts a PDF at library/law/workbook.pdf
./tasks deploy:site                   # after changing pages or topic content
./tasks logs
```

## The partner rate

A member is charged the partner price when their `members/{uid}` record has `pricingTier: "partner"`. The Client Hub, or Charlotte in the Firestore console, sets it before the member reaches payment. The Learning Hub never records why.

## What stays manual, and why

| Step | Why |
| --- | --- |
| Billing account with Sarah's card | Card details are entered only in Google's billing pages. |
| Authentication, Get started (sometimes) | A new project may need it once before its settings accept changes. |
| Google sign in client | Created by the console's Enable switch; Google offers no command for it. |
| Stripe team invite, restricted key, customer emails, branding | Stripe offers no API for these account settings. |
| DNS records | They live with the executiveframe.co.nz DNS host. |
