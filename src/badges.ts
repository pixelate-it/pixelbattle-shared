import { FlagsGenerator } from "./flags";

export type BadgeIdentifier =
    | "DEVELOPER"
    | "MODERATOR"
    | "SPONSOR"
    | "ACTIVE";

/**
 * The badges a user can carry, as a bitfield.
 *
 * Order is the wire format - append only, and retire a badge with `null` in
 * its slot rather than removing it. See FlagsGenerator.
 */
export const badges = new FlagsGenerator<BadgeIdentifier>([
    "DEVELOPER",
    "MODERATOR",
    "SPONSOR",
    "ACTIVE",
]);
