# Test guide for Charlotte, 12 November 2026

2 parts. Part 1 is the local preview on your Mac, which shows tonight's changes with sample content and no login. Part 2 is a click through of the live site with your own login.

## Before you start

- The live site is the version deployed at 9.02 pm on 11 November. Changes made after that are in the folder and committed, not live. Steps that need the newer pages say "after the next deploy".
- To put the newer pages live, run `npm run deploy:hosting` in the `eflearninghub` folder. Nothing else needs deploying for these changes.
- Payments are closed. No Learning Hub prices exist in Stripe, so nobody can be charged during this test.

## Part 1: the local preview

Start it in Terminal:

```
cd ~/eflearninghub
npm run serve
```

Then open http://127.0.0.1:5055/ in your browser. Press Control and C in Terminal to stop it. If Terminal says the address is in use, another preview is already running on 5055: open the address anyway.

What the preview shows:

- Every page as it is in the folder now, including changes not yet live.
- The 3 sample lessons, the sample resource cards and the sample dashboard.
- The viewer opens with no login. The header says "Local preview".

What the preview cannot show:

- Logging in, joining or the account page. There is no sign in, so `/account/` sends you to Log in, and Log in answers "The Learning Hub could not be reached".
- Real membership states: trial, active, payment failed, cancelled, organisation place.
- Downloads. A download button answers "Downloads are switched off in the local preview."
- Live lessons and resource cards from Notion. The preview always uses the sample files.
- Stripe Checkout and the billing page.

Useful preview addresses:

| Address | What it shows |
| --- | --- |
| http://127.0.0.1:5055/ | Home: dashboard, library, Resources |
| http://127.0.0.1:5055/hub/the-tunnel-and-the-way-back/ | The 10 step sample lesson, with a check, the loop, reflections, a scenario and a plan |
| http://127.0.0.1:5055/hub/centre/ | The 8 step sample lesson, which opens by asking about your last plan |
| http://127.0.0.1:5055/hub/centre-in-90-seconds/ | The 4 step tool |
| http://127.0.0.1:5055/start/ | The start page, not logged in |
| http://127.0.0.1:5055/start/?view=member | The start page as a logged in person with no membership sees it |
| http://127.0.0.1:5055/join/ | Join, steps 1 and 2 |

A quick look in the preview, about 5 minutes:

1. Open Home. You should see the Continue card with The Tunnel and the way back, the 4 loop boxes sitting 2 by 2 inside their card, and Resources at the bottom with 2 cards.
2. Press Start and go through the lesson with Next. The Back and Next bar should sit at the very bottom, never on top of the text. On step 1 choose "I am not sure, or not right now": the reply should show in full above the bar, with consultant@sarahanticich.co.nz as a link.
3. On a writing step, type a few words and pause. The line under the box should end with "Saved."
4. Press Finish on the last step. Home should show a boxed note, "You have finished The Tunnel and the way back."
5. Open the lesson again from its card. It should open on step 10 with a Start from the beginning button. Press it: you should be on step 1, and your writing should still be in Notes and files on the right.
6. Make the window narrow (under 900 px wide), or use your phone view. The 2 side columns become drawers behind the 2 buttons in the header. Open 1 and press Escape: it should close.

## Part 2: the live site, with your own login

Use https://executiveframe-learninghub.web.app in a normal browser window. Each step says what you should see.

### Not logged in

1. Open https://executiveframe-learninghub.web.app/start/ in a private window. You should see "Open your hub" and 3 cards: I am a client, I am a Learning Hub member, I am new here.
2. Open https://executiveframe-learninghub.web.app/ in the same window. You should be sent to Log in, and the address should end in `/login/?next=%2F`. The viewer never shows without a login.
3. Open https://executiveframe-learninghub.web.app/privacy/. You should see "Draft for approval" near the top and, under Your rights, consultant@sarahanticich.co.nz as a link that opens a new email.
4. Open https://executiveframe-learninghub.web.app/join/. You should see step 1 of 3 and the question about an access code. The heading says "Join the Executive Frame library" now, and "Join the Learning Hub" after the next deploy.
5. Press Continue without choosing. You should see "Please choose an answer." Choose No and press Continue: you should see "Create your login". Do not fill it in unless you want a new account. Press Back.

### Logging in

6. Open https://executiveframe-learninghub.web.app/login/. Press Log in with both boxes empty. You should see "Please enter your email address." under the first box.
7. Enter your email and a wrong password. You should see "That email address and password do not match an account." It should not say whether the address exists.
8. Press Show beside the password. The password should become readable and the button should say Hide.
9. Press "Forgotten your password?". You should see "Reset your password" with your email already filled in. Press "Back to log in" (do not send a link unless you want one).
10. Log in with your real password. What happens next depends on your login, as in steps 11 to 13.

### A login with no Learning Hub membership

11. After logging in you should see "Checking your membership" for a moment and then land on Join, step 1. This is right: your login works, and it has no membership yet. If you land on the lessons, your login has a membership or an organisation place.
12. Choose No and press Continue. You should see "You are signed in" with your email. Tick the privacy box and press Continue.
13. You should see step 3, "Choose how to pay", with Monthly at NZ$29 a month and Annual at NZ$XX (still marked as a placeholder). If your email belongs to an organisation with places, you see that organisation's name here: press "Pay for my own plan instead" to reach the plans.
14. Choose Monthly and press "Continue to secure payment". You should see "Opening secure payment" briefly, then be back on step 3 with a red message: "Secure payment could not be opened just now. Please try again in a moment." This is the expected result while no prices exist. You should not reach a Stripe page. If you do reach Stripe, stop and do not enter a card.
15. Open https://executiveframe-learninghub.web.app/account/. You should see "You do not have a membership yet", your email, how you signed in, and whether your email is confirmed. The button says "Join the library" now, and "Join the Learning Hub" after the next deploy.
16. On a phone, or with the window under 600 px wide, look at the top of the account page. Now the labels wrap onto 2 lines (Learning / Hub, Log / out). After the next deploy they should sit on 1 line with the mark alone at the left.

### The start page when logged in

17. While logged in, open https://executiveframe-learninghub.web.app/start/. You should see "Opening your hub" and then 1 of 3 things.
18. If your login is a Client Hub login: you are sent straight to the Client Hub at executiveframe-clienthub.web.app. The address should be the Client Hub's plain address, with nothing after it that names you or says you are a client.
19. If your login is neither a member nor a client: you see "Welcome back", "You are logged in as" your email, and 2 buttons, Join the Learning Hub and Open the Client Hub.
20. If your login has a Learning Hub membership: you go straight to Home in the viewer.
21. Open https://executiveframe-learninghub.web.app/start/?next=/hub/centre/ while logged in with no membership. You should get the same result as step 18 or 19, never the lesson.

For step 14, the message is a plain sentence on purpose: the function's own reason (a price is missing) is kept out of the page and goes to the function log.

### Logging out

22. On the account page press Log out. You should land on Log in with "You have logged out."
23. Press the browser's Back button and note what you see. It should send you to Log in again. If the account page shows again with your email on it, tell me: this could not be tested without a real login.

### If you have a login with a membership or an organisation place

These need a member login, so skip them if you do not have 1.

24. Log in. You should land on Home with the dashboard, your library and Resources. On a phone, a failed payment or a cancelled plan shows as a note at the top of Home.
25. Open the account menu at the bottom of the library (your initial and name) and choose "Log out and exit". After the next deploy the dialog opens with Cancel selected, not the tick box. Tick "Also clear my place, notes and reflections" only on a shared computer.

## What to tell me if something is off

The step number, what you saw in place of what the step says, the device and browser, and a screenshot if you can.
