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
    /** Shown to players. */
    name: string;
    /**
     * The rules, in a sentence or two, in the player's language.
     *
     * Not decoration: a mode whose rules are not stated reads as the game
     * misbehaving. The one that proves it is Infection, which is *meant* to be
     * left partly uncleared - a player who has not been told that experiences
     * a total cleanup followed by a fresh outbreak as a punishment.
     */
    description: string;
    traits: readonly ModeTrait[];
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
    name: "Ограниченная палитра",
    description:
        "В этом сезоне доступен только заданный набор цветов. Всё остальное " +
        "холст не примет.",
    traits: ["constrains"],
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

export const MODE_MANIFESTS = {
    palette: paletteManifest
} as const satisfies Record<string, ModeManifest>;

export type ModeId = keyof typeof MODE_MANIFESTS;

export function isModeId(value: string): value is ModeId {
    return value in MODE_MANIFESTS;
}
