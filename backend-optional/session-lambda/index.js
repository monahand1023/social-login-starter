'use strict';
// POST /session  { idToken } -> validates the Cognito ID token, stores a
// session in DynamoDB, returns an httpOnly cookie. Requires `aws-jwt-verify`
// and the AWS SDK v3 (bundled by SAM/CloudFormation build, or a Lambda layer).
const { CognitoJwtVerifier } = require('aws-jwt-verify');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { randomUUID } = require('node:crypto');
const { buildSessionCookie } = require('./cookie.js');

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.USER_POOL_ID,
  clientId: process.env.CLIENT_ID,
  tokenUse: 'id',
});
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.SESSIONS_TABLE;
const TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    if (!body.idToken) return resp(400, { error: 'idToken required' });

    const claims = await verifier.verify(body.idToken);

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
  } catch (err) {
    return resp(401, { error: 'invalid token: ' + err.message });
  }
};

function resp(statusCode, obj) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(obj),
  };
}
