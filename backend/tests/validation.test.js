import { describe, expect, it } from 'vitest';
import {
    createMatchSchema,
    listMatchesQuerySchema,
    matchIdParamSchema,
    updateScoreSchema,
} from '../src/validation/matches.js';
import { createCommentarySchema, listCommentaryQuerySchema } from '../src/validation/commentary.js';

const validMatch = {
    sport: 'football',
    homeTeam: 'JSM United',
    awayTeam: 'Drizzle United',
    startTime: '2026-02-01T12:00:00Z',
    endTime: '2026-02-01T14:00:00Z',
};

describe('match validation', () => {
    it('accepts a valid match and coerces scores', () => {
        const parsed = createMatchSchema.parse({ ...validMatch, homeScore: '2', awayScore: 1 });
        expect(parsed.homeScore).toBe(2);
        expect(parsed.awayScore).toBe(1);
    });

    it('rejects a match that ends before it starts', () => {
        const result = createMatchSchema.safeParse({ ...validMatch, endTime: validMatch.startTime });
        expect(result.success).toBe(false);
        expect(result.error.issues[0].path).toEqual(['endTime']);
    });

    it('rejects missing teams and non-ISO times', () => {
        expect(createMatchSchema.safeParse({ ...validMatch, homeTeam: '' }).success).toBe(false);
        expect(createMatchSchema.safeParse({ ...validMatch, startTime: 'tomorrow' }).success).toBe(false);
    });

    it('caps list limits at 100 and coerces query strings', () => {
        expect(listMatchesQuerySchema.parse({ limit: '25' })).toEqual({ limit: 25 });
        expect(listMatchesQuerySchema.safeParse({ limit: '101' }).success).toBe(false);
        expect(listMatchesQuerySchema.safeParse({ limit: '0' }).success).toBe(false);
    });

    it('only accepts positive integer ids', () => {
        expect(matchIdParamSchema.parse({ id: '7' })).toEqual({ id: 7 });
        expect(matchIdParamSchema.safeParse({ id: '-1' }).success).toBe(false);
        expect(matchIdParamSchema.safeParse({ id: 'abc' }).success).toBe(false);
    });

    it('rejects negative scores', () => {
        expect(updateScoreSchema.safeParse({ homeScore: -1, awayScore: 0 }).success).toBe(false);
    });
});

describe('commentary validation', () => {
    it('requires a minute and a non-empty message', () => {
        expect(createCommentarySchema.safeParse({ minute: 12, message: 'Goal!' }).success).toBe(true);
        expect(createCommentarySchema.safeParse({ minute: 12, message: '' }).success).toBe(false);
        expect(createCommentarySchema.safeParse({ message: 'Goal!' }).success).toBe(false);
    });

    it('accepts optional metadata and tags', () => {
        const parsed = createCommentarySchema.parse({ minute: 0, message: 'Kick-off', metadata: { var: true }, tags: ['start'] });
        expect(parsed.tags).toEqual(['start']);
    });

    it('caps list limits at 100', () => {
        expect(listCommentaryQuerySchema.safeParse({ limit: '100' }).success).toBe(true);
        expect(listCommentaryQuerySchema.safeParse({ limit: '500' }).success).toBe(false);
    });
});
