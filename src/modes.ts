/**
 * Game modes: the half both sides of the wire have to agree on.
 *
 * A mode's *implementation* is almost entirely server-side and unshareable -
 * it works in terms of the canvas buffer, the recording and the exclusive task
 * queue, none of which exist in a browser. What both sides genuinely need is
 * this manifest: an id, something to show a player, and the schema an admin
 * fills in. Fifty lines, not a library.
 *
 * Keeping it here rather than in a repository of its own is what makes a
 * mismatch a compile error on both sides: the server asserts it implements
 * every id, the client asserts it can render every id. Note this only catches
 * a mismatch of *types* - a server deployed ahead of the client still knows
 * modes the client's bundle does not, which is what `GET /game/modes` is for.
 */

/**
 * What a mode does to the canvas, which is all that decides whether two of
 * them can run together.
 *
 * The full pairwise matrix does not scale (ten modes is forty-five pairs) and
 * is not needed: every real incompatibility is "both of these move pixels
 * around" or "both of these replace the cooldown".
 */
export type ModeTrait =
    /** Only constrains what a player may place. Compatible with everything. */
    | "constrains"
    /**
     * Paints pixels it then owns. Several may coexist: each writes under its
     * own author, and a mode does not touch another's pixels unless it says so.
     */
    | "paints"
    /**
     * Moves existing pixels to other coordinates without owning them. At most
     * one per season - two of these moving the same pixel to different places
     * is undefined, not merely surprising.
     */
    | "relocates"
    /** Replaces the cooldown calculation outright. At most one per season. */
    | "owns-cooldown";

export interface ModeManifest {
    id: string;
    /**
     * A dot-namespaced key into the `modes` domain of the pixelbattle-i18n
     * catalog (`modes.<id>.name`) - not display text. The frontend resolves
     * it through `t()`; anything else reading this manifest (this server
     * included) gets the key, not a name in any language.
     */
    name: string;
    /**
     * The rules, in a sentence or two - `modes.<id>.description` in the same
     * catalog, same caveat as `name`.
     *
     * Not decoration: a mode whose rules are not stated reads as the game
     * misbehaving. The one that proves it is Infection, which is *meant* to be
     * left partly uncleared - a player who has not been told that experiences
     * a total cleanup followed by a fresh outbreak as a punishment.
     */
    description: string;
    traits: readonly ModeTrait[];
    /**
     * Colour this mode is shown in, as 0x00RRGGBB.
     *
     * A display concern, and it lives here for the same reason the name does:
     * a mode is named in several places on both sides of the wire - the pixel
     * it painted, the season's badge, the admin panel - and they should not
     * each invent their own.
     */
    accent: number;
    /**
     * JSON Schema for this mode's config, flat and fully bounded.
     *
     * Two consumers: the server validates an admin's input against it, and the
     * admin panel builds its form from it. Flat on purpose - a form generator
     * for arbitrary nesting is a project, and no mode has needed one.
     */
    configSchema: object;
    /** Merged underneath whatever the admin supplied. */
    defaults: Record<string, unknown>;
}

const COLOR = { type: "integer", minimum: 0, maximum: 0xffffff } as const;

export const paletteManifest: ModeManifest = {
    id: "palette",
    name: "modes.palette.name",
    description: "modes.palette.description",
    traits: ["constrains"],
    accent: 0x6c8ebf,
    configSchema: {
        type: "object",
        additionalProperties: false,
        required: ["colors"],
        properties: {
            colors: {
                type: "array",
                minItems: 2,
                maxItems: 64,
                uniqueItems: true,
                items: COLOR
            }
        }
    },
    /* `colors` has no default and is required: a palette mode with a palette
     * someone else chose is not a decision anybody made. */
    defaults: {}
};

export const infectionManifest: ModeManifest = {
    id: "infection",
    name: "modes.infection.name",
    description: "modes.infection.description",
    traits: ["paints"],
    // The blot's own colour, so the two never disagree.
    accent: 0x4b2d5e,
    configSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
            color: COLOR,
            // Pixels per second at `referenceArea`, before any slowdown.
            baseRate: { type: "number", minimum: 0, maximum: 1000 },
            referenceArea: { type: "integer", minimum: 1, maximum: 1500000 },
            // How sharply growth slows as the blot gets bigger. 0 disables it.
            decay: { type: "number", minimum: 0, maximum: 2 },
            maxPerTick: { type: "integer", minimum: 1, maximum: 4096 },
            // Share of the canvas the blot may never exceed.
            maxAreaFraction: { type: "number", minimum: 0, maximum: 1 },
            // Players online for the blot to grow at full speed.
            referenceOnline: { type: "integer", minimum: 1, maximum: 10000 },
            respawnDelayMs: { type: "integer", minimum: 0, maximum: 86400000 },
            seedCount: { type: "integer", minimum: 1, maximum: 64 },
            tickMs: { type: "integer", minimum: 1000, maximum: 3600000 }
        }
    },
    defaults: {
        color: 0x4b2d5e,
        baseRate: 4,
        referenceArea: 1000,
        decay: 0.5,
        maxPerTick: 64,
        maxAreaFraction: 0.6,
        referenceOnline: 10,
        respawnDelayMs: 120000,
        seedCount: 4,
        tickMs: 1000
    }
};

export const decayManifest: ModeManifest = {
    id: "decay",
    name: "modes.decay.name",
    description: "modes.decay.description",
    traits: ["paints"],
    accent: 0x9aa0a6,
    configSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
            // How long a pixel must go untouched before it starts to fade.
            ageMs: { type: "integer", minimum: 60000, maximum: 604800000 },
            // Share of the remaining distance to white taken per step.
            stepFraction: { type: "number", minimum: 0.01, maximum: 1 },
            maxPerTick: { type: "integer", minimum: 1, maximum: 4096 },
            // Ticks one full pass over the canvas is spread across.
            scanTicks: { type: "integer", minimum: 1, maximum: 100000 },
            tickMs: { type: "integer", minimum: 1000, maximum: 3600000 }
        }
    },
    defaults: {
        ageMs: 21600000,
        stepFraction: 0.15,
        maxPerTick: 256,
        scanTicks: 600,
        tickMs: 1000
    }
};

export const inflationManifest: ModeManifest = {
    id: "inflation",
    name: "modes.inflation.name",
    description: "modes.inflation.description",
    traits: ["relocates"],
    accent: 0xc9803a,
    configSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
            /* Side of the canvas the season opens on, and the floor it never
               shrinks below. `maxSide` must be this plus a whole number of
               steps, or the last step clamps and the frame stops being
               honest - the server checks. */
            startSide: { type: "integer", minimum: 4, maximum: 4096 },
            maxSide: { type: "integer", minimum: 4, maximum: 4096 },
            /* Pixels added to (or taken from) every side at once. The canvas
               changes by twice this on each axis. */
            step: { type: "integer", minimum: 1, maximum: 64 },
            // Share one player must hold for the canvas to grow.
            growAt: { type: "number", minimum: 0.01, maximum: 1 },
            /* Share below which the canvas starts counting down to a cut.
               Equal to `growAt` by default, which is what makes the canvas
               breathe at its ceiling rather than rest there; lower it to give
               the size somewhere to stand still. */
            shrinkBelow: { type: "number", minimum: 0.01, maximum: 1 },
            /* Countdown to a cut, on the smallest and the largest canvas. The
               bigger the canvas the shorter the wait, which is what keeps the
               size from wandering. */
            shrinkMaxMs: { type: "integer", minimum: 1000, maximum: 3600000 },
            shrinkMinMs: { type: "integer", minimum: 1000, maximum: 3600000 },
            tickMs: { type: "integer", minimum: 1000, maximum: 60000 }
        }
    },
    defaults: {
        startSide: 8,
        maxSide: 100,
        step: 2,
        growAt: 0.25,
        shrinkBelow: 0.25,
        shrinkMaxMs: 180000,
        shrinkMinMs: 60000,
        tickMs: 1000
    }
};

export const MODE_MANIFESTS = {
    palette: paletteManifest,
    infection: infectionManifest,
    decay: decayManifest,
    inflation: inflationManifest
} as const satisfies Record<string, ModeManifest>;

export type ModeId = keyof typeof MODE_MANIFESTS;

export function isModeId(value: string): value is ModeId {
    return value in MODE_MANIFESTS;
}
