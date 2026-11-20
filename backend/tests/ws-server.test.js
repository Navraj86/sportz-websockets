import http from 'node:http';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { WebSocket } from 'ws';

// Arcjet needs a real key and network access; these tests cover the pub/sub logic, not the
// protection layer, so the upgrade check is disabled.
vi.mock('../src/arcjet.js', () => ({ wsArcjet: null, httpArcjet: null }));

const { attachWebSocketServer } = await import('../src/ws/server.js');

let server;
let url;
let broadcast;

beforeAll(async () => {
    server = http.createServer();
    broadcast = attachWebSocketServer(server);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    url = `ws://127.0.0.1:${server.address().port}/ws`;
});

afterAll(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
});

/** Opens a client and collects every JSON message it receives. */
async function connect() {
    const socket = new WebSocket(url);
    const messages = [];
    socket.on('message', (data) => messages.push(JSON.parse(data.toString())));
    await new Promise((resolve, reject) => {
        socket.once('open', resolve);
        socket.once('error', reject);
    });
    const next = (type) =>
        vi.waitFor(() => {
            const found = messages.find((m) => m.type === type);
            if (!found) throw new Error(`no ${type} yet`);
            return found;
        });
    const send = (payload) => socket.send(typeof payload === 'string' ? payload : JSON.stringify(payload));
    return { socket, messages, next, send };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 80));

describe('WebSocket server', () => {
    it('greets every new client', async () => {
        const client = await connect();
        await expect(client.next('welcome')).resolves.toEqual({ type: 'welcome' });
        client.socket.close();
    });

    it('sends commentary only to subscribers of that match', async () => {
        const watcher = await connect();
        const other = await connect();

        watcher.send({ type: 'subscribe', matchId: 1 });
        other.send({ type: 'subscribe', matchId: 2 });
        await watcher.next('subscribed');
        await other.next('subscribed');

        broadcast.broadcastCommentary(1, { id: 10, message: 'Goal!' });

        const received = await watcher.next('commentary');
        expect(received.data).toEqual({ id: 10, message: 'Goal!' });
        await settle();
        expect(other.messages.some((m) => m.type === 'commentary')).toBe(false);

        watcher.socket.close();
        other.socket.close();
    });

    it('stops delivering after unsubscribe', async () => {
        const client = await connect();
        client.send({ type: 'subscribe', matchId: 3 });
        await client.next('subscribed');
        client.send({ type: 'unsubscribe', matchId: 3 });
        await client.next('unsubscribed');

        broadcast.broadcastCommentary(3, { id: 11, message: 'Yellow card' });
        await settle();
        expect(client.messages.some((m) => m.type === 'commentary')).toBe(false);

        client.socket.close();
    });

    it('announces new matches to every connected client', async () => {
        const a = await connect();
        const b = await connect();

        broadcast.broadcastMatchCreated({ id: 42, homeTeam: 'A', awayTeam: 'B' });

        await expect(a.next('match_created')).resolves.toMatchObject({ data: { id: 42 } });
        await expect(b.next('match_created')).resolves.toMatchObject({ data: { id: 42 } });

        a.socket.close();
        b.socket.close();
    });

    it('answers malformed messages with an error and nothing else', async () => {
        const client = await connect();
        await client.next('welcome');

        client.send('{not json');
        await expect(client.next('error')).resolves.toEqual({ type: 'error', message: 'Invalid JSON' });

        // Ignored: wrong type and non-integer ids.
        client.send({ type: 'subscribe', matchId: '1' });
        client.send({ type: 'dance' });
        await settle();
        expect(client.messages.map((m) => m.type)).toEqual(['welcome', 'error']);

        client.socket.close();
    });

    it('cleans up subscriptions when a client disconnects', async () => {
        const leaver = await connect();
        const stayer = await connect();
        leaver.send({ type: 'subscribe', matchId: 5 });
        stayer.send({ type: 'subscribe', matchId: 5 });
        await leaver.next('subscribed');
        await stayer.next('subscribed');

        leaver.socket.close();
        await settle();

        broadcast.broadcastCommentary(5, { id: 12, message: 'Half-time' });
        await expect(stayer.next('commentary')).resolves.toMatchObject({ data: { id: 12 } });

        stayer.socket.close();
    });

    it('refuses upgrades on other paths and closes the socket', async () => {
        const socket = new WebSocket(url.replace('/ws', '/nope'));
        const outcome = await new Promise((resolve) => {
            socket.once('open', () => resolve('open'));
            socket.once('error', () => resolve('refused'));
        });
        expect(outcome).toBe('refused');
    });
});
