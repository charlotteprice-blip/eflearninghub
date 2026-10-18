// Security rules tests for the Executive Frame Learning Hub.
//
// Run with:  npm run test:rules
// Starts the Firestore and Storage emulators with firebase.test.json and runs this file with the Node test runner.
// Requires Java 21 or later. The emulator applies the same firestore.rules that firebase.json deploys to the named
// database learninghub; the rules are written against /databases/{database}/documents, so the default emulator
// database exercises identical logic. Fixtures use invented identifiers only.

import { readFileSync } from 'node:fs';
import { after, before, beforeEach, describe, test } from 'node:test';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { ref, getBytes, uploadString } from 'firebase/storage';

let env;
const MEMBER = 'member-a';
const OTHER = 'member-b';

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-learninghub',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
    storage: { rules: readFileSync('storage.rules', 'utf8'), host: '127.0.0.1', port: 9199 },
  });
});
after(async () => { await env?.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'members', MEMBER), { stripeCustomerId: 'cus_a', downloadsUsed: 0 });
    await setDoc(doc(db, 'members', OTHER), { stripeCustomerId: 'cus_b', pricingTier: 'partner' });
    await setDoc(doc(db, 'organisations', 'org-1'), { name: 'Example', accessCodeHash: 'hash', seatsTotal: 5, seatsUsed: 1 });
    await uploadString(ref(ctx.storage(), 'library/all/workbook.pdf'), 'pdf');
  });
});

const as = (uid) => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext());

describe('members', () => {
  test('a member reads their own record', async () => {
    await assertSucceeds(getDoc(doc(as(MEMBER).firestore(), 'members', MEMBER)));
  });
  test("a member cannot read another member's record", async () => {
    await assertFails(getDoc(doc(as(MEMBER).firestore(), 'members', OTHER)));
  });
  test('nobody can list members', async () => {
    await assertFails(getDocs(collection(as(MEMBER).firestore(), 'members')));
  });
  test('signed out people read nothing', async () => {
    await assertFails(getDoc(doc(as(null).firestore(), 'members', MEMBER)));
  });
  test('a member cannot change their own record, for example to give themselves the partner rate', async () => {
    await assertFails(updateDoc(doc(as(MEMBER).firestore(), 'members', MEMBER), { pricingTier: 'partner' }));
    await assertFails(setDoc(doc(as(MEMBER).firestore(), 'members', MEMBER), { downloadsUsed: 0 }));
    await assertFails(deleteDoc(doc(as(MEMBER).firestore(), 'members', MEMBER)));
  });
});

describe('organisations and everything else', () => {
  test('organisations are never readable from a browser', async () => {
    await assertFails(getDoc(doc(as(MEMBER).firestore(), 'organisations', 'org-1')));
    await assertFails(getDocs(collection(as(MEMBER).firestore(), 'organisations')));
  });
  test('organisations cannot be written from a browser', async () => {
    await assertFails(updateDoc(doc(as(MEMBER).firestore(), 'organisations', 'org-1'), { seatsTotal: 500 }));
  });
  test('unnamed collections are closed', async () => {
    await assertFails(getDoc(doc(as(MEMBER).firestore(), 'anything', 'x')));
    await assertFails(setDoc(doc(as(MEMBER).firestore(), 'anything', 'x'), { a: 1 }));
  });
});

describe('storage', () => {
  test('members cannot read library files directly; downloads use signed links', async () => {
    await assertFails(getBytes(ref(as(MEMBER).storage(), 'library/all/workbook.pdf')));
  });
  test('nobody can upload from a browser', async () => {
    await assertFails(uploadString(ref(as(MEMBER).storage(), 'library/all/new.pdf'), 'x'));
  });
});
