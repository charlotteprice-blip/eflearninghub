// Lists every terminal task for the Learning Hub.   npm run tasks

const groups = [
  ['First time on a computer', [
    ['nvm install 22 && nvm use 22', 'Use Node 22, the version the functions run on'],
    ['npm install', 'Install the tools this repository uses (also installs the functions packages)'],
    ['npx firebase login', 'Log the Firebase CLI in as an owner of ef-client-hub'],
    ['gcloud auth login', 'Log the Google Cloud CLI in as the same person'],
    ['gcloud auth application-default login', 'Let the organisation script act as you'],
    ['gcloud config set project ef-client-hub', 'Point gcloud at the shared project'],
    ['gcloud auth application-default set-quota-project ef-client-hub', 'Bill API calls from the scripts to the shared project'],
    ['npx firebase login --reauth', 'Sign the Firebase CLI in again when a stored login has gone stale'],
  ]],
  ['Set up Firebase (replaces the console steps)', [
    ['npm run setup:check', 'Report what exists and what is missing; changes nothing'],
    ['npm run setup', 'Create each missing piece, asking before every change'],
    ['npm run setup -- --dry-run', 'Show the commands setup would run, change nothing'],
    ['npm run setup -- --only=functionsaccess', 'Run 1 step: tools, project, apis, database, site, bucket, webapp, authdomains, microsoft, google, auditlogs, functionsaccess, secret, domain, access'],
    ['npm run setup -- --only=passwordpolicy', 'Enforce the 10 character password rule for the shared login (affects the Client Hub too)'],
  ]],
  ['Stripe (Sarah\'s Executive Frame account; asks for the key, hidden)', [
    ['npm run stripe -- check', 'Check every price and portal setting the app relies on'],
    ['npm run stripe -- prices --monthly C --annual C --partner-monthly C --partner-annual C', 'Create the products and prices (cents, GST included)'],
    ['npm run stripe -- portal', 'Cancel at period end, card updates, monthly and annual switching'],
    ['npm run secret', 'Save or replace the restricted Stripe key in Secret Manager'],
  ]],
  ['Organisations and files', [
    ['npm run orgs -- list', 'Show organisations, places in use and contract end dates'],
    ['npm run orgs -- add --id ID --name "Name" --domains a.co.nz --seats 20 --contract-end 2027-06-30', 'Add or update an organisation; prints a new access code once'],
    ['npm run orgs -- code ID', 'Replace an organisation\'s access code'],
    ['npm run upload -- file.pdf law', 'Upload a workbook to library/law/'],
    ['npm run upload -- list', 'List the workbooks in the library'],
  ]],
  ['Build and look', [
    ['npm run serve', 'Open the viewer with sample content at 127.0.0.1:5055 (no sign in)'],
    ['npm run emulators', 'Run Firebase locally on the demo project demo-learninghub'],
    ['npm run vendor', 'Refresh the self hosted Firebase SDK and Figtree'],
  ]],
  ['Check', [
    ['npm run check', 'Function tests and colour contrast (fast, no Java)'],
    ['npm run test:rules', 'Security rules tests in the emulators (needs Java 21+)'],
    ['npm test', 'Everything above'],
  ]],
  ['Deploy (always named parts, never a bare firebase deploy)', [
    ['npm run deploy:rules', 'Firestore (learninghub database) and Storage rules and indexes'],
    ['npm run deploy:functions', 'The Cloud Functions (learning codebase)'],
    ['npm run deploy:hosting', 'The website files'],
    ['npm run deploy', 'All of the above, after every test passes'],
    ['npm run logs', 'Function logs'],
  ]],
  ['Records', [
    ['npm run worklog', 'Print today\'s commits as a work log entry to paste into the App 1 Worklog in Notion'],
  ]],
];

const width = Math.min(60, Math.max(...groups.flatMap(([, rows]) => rows.map(([cmd]) => cmd.length))));
for (const [title, rows] of groups) {
  console.log(`\n\x1b[1m${title}\x1b[0m`);
  for (const [cmd, what] of rows) console.log(cmd.length > width ? `  ${cmd}\n  ${''.padEnd(width)}  \x1b[2m${what}\x1b[0m` : `  ${cmd.padEnd(width)}  \x1b[2m${what}\x1b[0m`);
}
console.log('');
