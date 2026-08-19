import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { env } from '../config/env.js';

let client = null;

function storageError() {
  const error = new Error('File storage is not enabled for this project yet. Enable storage in Dailey OS to use attachments.');
  error.statusCode = 400;
  return error;
}

// Lazy client so the app boots cleanly when storage is not configured.
function getClient() {
  if (!env.storage.enabled) throw storageError();
  if (!client) {
    client = new S3Client({
      region: env.storage.s3.region,
      endpoint: env.storage.s3.endpoint,
      forcePathStyle: env.storage.s3.forcePathStyle,
      credentials: {
        accessKeyId: env.storage.s3.accessKeyId,
        secretAccessKey: env.storage.s3.secretAccessKey,
      },
    });
  }
  return client;
}

export async function uploadBuffer({ objectKey, body, contentType }) {
  await getClient().send(
    new PutObjectCommand({
      Bucket: env.storage.s3.bucket,
      Key: objectKey,
      Body: body,
      ContentType: contentType || 'application/octet-stream',
    }),
  );
}

export async function deleteObject(objectKey) {
  await getClient().send(
    new DeleteObjectCommand({
      Bucket: env.storage.s3.bucket,
      Key: objectKey,
    }),
  );
}

export async function getObject(objectKey) {
  const response = await getClient().send(
    new GetObjectCommand({
      Bucket: env.storage.s3.bucket,
      Key: objectKey,
    }),
  );
  return response;
}
