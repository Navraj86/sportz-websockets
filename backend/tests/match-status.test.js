import { describe, expect, it, vi } from 'vitest';
import { getMatchStatus, syncMatchStatus } from '../src/utils/match-status.js';

const start = '2026-01-01T10:00:00.000Z';
const end = '2026-01-01T12:00:00.000Z';

describe('getMatchStatus', () => {
    it('is scheduled before the start time', () => {
        expect(getMatchStatus(start, end, new Date('2026-01-01T09:59:59Z'))).toBe('scheduled');
    });

    it('is live from the start time until just before the end', () => {
        expect(getMatchStatus(start, end, new Date(start))).toBe('live');
        expect(getMatchStatus(start, end, new Date('2026-01-01T11:59:59Z'))).toBe('live');
    });

    it('is finished from the end time on', () => {
        expect(getMatchStatus(start, end, new Date(end))).toBe('finished');
    });

    it('returns null for invalid dates', () => {
        expect(getMatchStatus('not a date', end)).toBeNull();
        expect(getMatchStatus(start, undefined)).toBeNull();
    });
});

describe('syncMatchStatus', () => {
    it('persists and returns the new status when it changed', async () => {
        const match = { status: 'scheduled', startTime: '2000-01-01T00:00:00Z', endTime: '2999-01-01T00:00:00Z' };
        const updateStatus = vi.fn().mockResolvedValue(undefined);

        await expect(syncMatchStatus(match, updateStatus)).resolves.toBe('live');
        expect(updateStatus).toHaveBeenCalledExactlyOnceWith('live');
        expect(match.status).toBe('live');
    });

    it('does not write when the status is already correct', async () => {
        const match = { status: 'finished', startTime: '2000-01-01T00:00:00Z', endTime: '2000-01-01T01:00:00Z' };
        const updateStatus = vi.fn();

        await expect(syncMatchStatus(match, updateStatus)).resolves.toBe('finished');
        expect(updateStatus).not.toHaveBeenCalled();
    });

    it('keeps the stored status when the dates are invalid', async () => {
        const match = { status: 'scheduled', startTime: null, endTime: null };
        const updateStatus = vi.fn();

        await expect(syncMatchStatus(match, updateStatus)).resolves.toBe('scheduled');
        expect(updateStatus).not.toHaveBeenCalled();
    });
});
