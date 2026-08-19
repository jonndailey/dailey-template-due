import path from 'node:path';
import { env } from '../config/env.js';
import { deleteObject, getObject, uploadBuffer } from './s3.js';

function sanitizeSegment(input) {
  return String(input || '')
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function buildAttachmentObjectKey({ workspaceSlug, taskId, fileId, filename }) {
  const cleanName = sanitizeSegment(filename || 'file');
  return [
    env.storage.prefix,
    sanitizeSegment(workspaceSlug || 'workspace'),
    'tasks',
    sanitizeSegment(taskId),
    `${sanitizeSegment(fileId)}-${cleanName}`,
  ].join('/');
}

export { uploadBuffer, deleteObject, getObject };
