import type { IncomingMessage, ServerResponse } from 'node:http'
export default function createEditorMiddleware(options?: { publish?: () => Promise<unknown>; onPublished?: () => void; repository?: string; mode?: 'text' | 'content'; afterSave?: () => Promise<unknown>; directory?: string; backupRoot?: string }): (request: IncomingMessage, response: ServerResponse, next: () => void) => Promise<void>
