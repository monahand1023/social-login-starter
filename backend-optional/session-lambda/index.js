'use strict';
// Session API for social-login-starter (optional "Level 2"), behind a Lambda
// Function URL. Three operations, routed by HTTP method:
//   POST    { idToken }  -> validate the Cognito ID token, create a session,
//                           return an httpOnly cookie
//   GET                  -> read the session cookie, return { sub, email } or 401
//   DELETE               -> clear the session cookie and delete the session row
// Requires `aws-jwt-verify` and the AWS SDK v3 (installed via `npm install` in
// this folder before `sam build`).
const { CognitoJwtVerifier } = require('aws-jwt-verify');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  DeleteCommand,
} = require('@aws-sdk/lib-dynamodb');
const { randomUUID } = require('node:crypto');
const {
  buildSessionCookie,
  clearSessionCookie,
  parseSessionId,
} = require('./cookie.js');

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.USER_POOL_ID,
  clientId: process.env.CLIENT_ID,
  tokenUse: 'id',
});
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.SESSIONS_TABLE;
const TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

exports.handler = async (event) => {
  const method =
    event.requestContext &&
    event.requestContext.http &&
    event.requestContext.http.method;
  try {
    if (method === 'POST') return await createSession(event);
    if (method === 'GET') return await readSession(event);
    if (method === 'DELETE') return await deleteSession(event);
    return resp(405, { error: 'method not allowed' });
  } catch (err) {
    return resp(401, { error: 'unauthorized: ' + err.message });
  }
};

// POST { idToken } -> verify, store session, set cookie.
async function createSession(event) {
  const body = JSON.parse(event.body || '{}');
  if (!body.idToken) return resp(400, { error: 'idToken required' });

  const claims = await verifier.verify(body.idToken); // throws if invalid

  const sessionId = randomUUID();
  const now = Math.floor(Date.now() / 1000);
  await ddb.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        sessionId,
        sub: claims.sub,
        email: claims.email,
        createdAt: now,
        expiresAt: now + TTL_SECONDS, // DynamoDB TTL attribute
      },
    })
  );

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    cookies: [buildSessionCookie(sessionId, TTL_SECONDS)],
    body: JSON.stringify({ sub: claims.sub, email: claims.email }),
  };
}

// GET -> read the session cookie, return the user (or 401).
async function readSession(event) {
  const sessionId = parseSessionId(event.cookies);
  if (!sessionId) return resp(401, { error: 'no session' });

  const { Item } = await ddb.send(
    new GetCommand({ TableName: TABLE, Key: { sessionId } })
  );
  const now = Math.floor(Date.now() / 1000);
  if (!Item || (Item.expiresAt && Item.expiresAt < now)) {
    return resp(401, { error: 'no session' });
  }
  return resp(200, { sub: Item.sub, email: Item.email });
}

// DELETE -> clear the cookie and delete the session row (logout).
async function deleteSession(event) {
  const sessionId = parseSessionId(event.cookies);
  if (sessionId) {
    await ddb.send(
      new DeleteCommand({ TableName: TABLE, Key: { sessionId } })
    );
  }
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    cookies: [clearSessionCookie()],
    body: JSON.stringify({ ok: true }),
  };
}

function resp(statusCode, obj) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(obj),
  };
}
