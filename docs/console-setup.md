# Console set-up checklist

Everything the code cannot do for itself. Work top to bottom; test mode throughout until launch.

## Firebase (project `executiveframe-app`, owned by Sarah's Google Workspace)

1. Create the project under Sarah's account and add Charlotte as Owner. Upgrade to the Blaze plan (needed for Functions and Secret Manager) and set a NZ$10 monthly budget alert.
2. Firestore: create the **(default)** database in `australia-southeast1`. The Client Hub should use its own **named** database (for example `clients`), because Firestore rules deploy per database and this repository deploys rules for (default) only.
3. Storage: create the default bucket in `australia-southeast1`. Upload library PDFs to `library/<arm>/<file>.pdf` (or `library/all/` for files every member can download).
4. Authentication, Sign-in method: enable **Google**, **Microsoft** and **Email/Password**.
   - Microsoft needs a free Microsoft Entra app registration (any organisation directory and personal accounts). Paste its client ID and secret into Firebase, and add Firebase's redirect URI to the Entra app.
   - Password policy: at least 10 characters, require a number and a special character (matches the join page).
   - Authorised domains: add `app.executiveframe.co.nz` (and later `clients.executiveframe.co.nz`).
   - Templates: set the sender name to Executive Frame, and later a custom sender domain on executiveframe.co.nz.
5. Add a Web app to the project (no settings to copy: Hosting serves them at `/__/firebase/init.json`).
6. Hosting: the default site serves this app. Connect the custom domain `app.executiveframe.co.nz` at launch (DNS records at whoever hosts executiveframe.co.nz DNS).
7. Secret Manager: `firebase functions:secrets:set STRIPE_SECRET_KEY` and paste the **restricted test key** (below).
8. Signed download links: give the Functions runtime service account (`<project-number>-compute@developer.gserviceaccount.com`) the **Service Account Token Creator** role on itself in IAM. Without it getDownloadLink fails.
9. Deploy: `firebase deploy --only hosting,functions:learning,firestore,storage`.

## Stripe (Sarah's Executive Frame account, never the Charlotte Price Consulting account)

1. Invite Charlotte as Administrator.
2. Developers, API keys: create a **restricted key** for the app with write access to Customers, Checkout Sessions, Subscriptions and Customer portal, and read access to Prices and Products. Store it only in Secret Manager.
3. Run `scripts/stripe-setup.mjs` with a secret test key and the confirmed amounts (in cents, GST included). It creates the "Executive Frame Library" product with the `library_monthly`, `library_annual`, `partner_monthly` and `partner_annual` prices, and the "Organisation seat" product with the NZ$0 `organisation_seat` price.
4. Settings, Billing, Customer portal: allow cancelling **at the end of the billing period**, updating the payment method, viewing invoices, and switching plans between the Library monthly and annual prices. Leave the partner and seat prices out of plan switching. Set the default return link to `https://app.executiveframe.co.nz/account/`.
5. Settings, Billing, Subscriptions and emails: turn on receipts, the trial ending reminder (7 days is the trial, so 3 days before is sensible) and failed payment emails.
6. Branding: Executive Frame name, logo and the navy `#2E4062` accent.
7. Tax: if Executive Frame is GST registered, add the NZ registration in Stripe Tax, then set `AUTOMATIC_TAX = true` in `functions/core.js`. Prices are created as tax inclusive either way.
8. Existing Payment Links on the public site: change their after-payment redirect to `/thank-you.html` (separate from this app).

## Organisations

`node scripts/add-organisation.mjs --id <id> --name "<Name>" --domains <domain> --seats <n> --contract-end <yyyy-mm-dd>` after `gcloud auth application-default login`. The access code is printed once and stored only as a hash. Invoice the organisation separately (Xero).

## Partner rate

A member is charged the partner price when their `members/{uid}` document has `pricingTier: "partner"`. Nothing in this app sets it: the Client Hub, or Charlotte in the Firestore console, sets it before the member reaches payment. The Learning Hub never records why.
