/**
 * A bitfield over a fixed set of named flags, carried as a decimal string.
 *
 * A string rather than a number because a bitfield outgrows Number's 53 safe
 * integer bits long before it outgrows a bigint, and JSON cannot carry a
 * bigint. Callers that store the value as a number today can keep doing so -
 * `String(value)` on the way in is enough.
 */
export class FlagsGenerator<Flag extends string> {
    /** Each flag's bit, in declaration order. */
    public readonly bits: ReadonlyMap<Flag, bigint>;

    /**
     * @param order flag names by bit position, lowest first.
     *
     * **This order is the persisted format.** A stored value only keeps its
     * meaning as long as positions stay put, so treat the list as append-only:
     * add new flags at the end, and retire one by replacing it with `null`
     * rather than deleting the entry, which would shift everything after it.
     */
    constructor(order: readonly (Flag | null)[]) {
        const bits = new Map<Flag, bigint>();

        order.forEach((flag, index) => {
            if (flag !== null) bits.set(flag, 1n << BigInt(index));
        });

        this.bits = bits;
    }

    /** Every flag this set knows about, in bit order. */
    public get all(): Flag[] {
        return [...this.bits.keys()];
    }

    public encode(flags: readonly Flag[]): string {
        let value = 0n;

        for (const flag of flags) {
            value |= this.bits.get(flag) ?? 0n;
        }

        return value.toString();
    }

    public decode(encoded: string): Flag[] {
        const value = this.parse(encoded);
        const flags: Flag[] = [];

        for (const [flag, bit] of this.bits) {
            if ((value & bit) === bit) flags.push(flag);
        }

        return flags;
    }

    public has(encoded: string, flag: Flag): boolean {
        const bit = this.bits.get(flag);
        if (bit === undefined) return false;

        return (this.parse(encoded) & bit) === bit;
    }

    public add(encoded: string, flag: Flag): string {
        const bit = this.bits.get(flag);
        if (bit === undefined) return encoded;

        return (this.parse(encoded) | bit).toString();
    }

    public remove(encoded: string, flag: Flag): string {
        const bit = this.bits.get(flag);
        if (bit === undefined) return encoded;

        return (this.parse(encoded) & ~bit).toString();
    }

    /**
     * An unparseable value reads as "no flags" rather than throwing. This is
     * rendered straight into a profile view from whatever the database holds,
     * and a malformed row should not take the page down with it.
     */
    private parse(encoded: string): bigint {
        try {
            return BigInt(encoded || "0");
        } catch {
            return 0n;
        }
    }
}
