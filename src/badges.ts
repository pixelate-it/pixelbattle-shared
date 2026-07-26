export type BadgeIdentificatior =
    "DEVELOPER" | "MODERATOR" | "SPONSOR" | "ACTIVE";

export class BadgesGenerator {
    public static readonly badges = new Map<BadgeIdentificatior, bigint>([
        ["DEVELOPER", 1n << 0n], // 1
        ["MODERATOR", 1n << 1n], // 2
        ["SPONSOR", 1n << 2n], // 4
        ["ACTIVE", 1n << 3n], // 8
        // etc...
    ]);

    public static encodeUserBadges(userBadges: BadgeIdentificatior[]): string {
        let encodedValue = 0n;

        userBadges.forEach((badge) => {
            const badgeValue = BadgesGenerator.badges.get(badge);
            if (badgeValue !== undefined) encodedValue |= badgeValue;
        });

        return encodedValue.toString();
    }

    public static decodeUserBadges(
        encodedValue: string,
    ): BadgeIdentificatior[] {
        const decodedBadges: BadgeIdentificatior[] = [];
        const value = BigInt(encodedValue || "0");

        BadgesGenerator.badges.forEach((badgeValue, badgeName) => {
            if ((value & badgeValue) === badgeValue)
                decodedBadges.push(badgeName);
        });

        return decodedBadges;
    }

    public static hasBadgeInString(
        encodedValue: string,
        badgeName: BadgeIdentificatior,
    ): boolean {
        const value = BigInt(encodedValue || "0");
        const badgeValue = BadgesGenerator.badges.get(badgeName);

        return badgeValue ? (value & badgeValue) === badgeValue : false;
    }

    public static addBadgeToString(
        encodedValue: string,
        badgeName: BadgeIdentificatior,
    ): string {
        const badgeValue = BadgesGenerator.badges.get(badgeName);
        if (badgeValue === undefined) return encodedValue;

        const value = BigInt(encodedValue || "0");
        const updatedValue = value | badgeValue;

        return updatedValue.toString();
    }

    public static removeBadgeFromString(
        encodedValue: string,
        badgeName: BadgeIdentificatior,
    ): string {
        const badgeValue = BadgesGenerator.badges.get(badgeName);
        if (badgeValue === undefined) return encodedValue;

        const value = BigInt(encodedValue || "0");
        const updatedValue = value & ~badgeValue;

        return updatedValue.toString();
    }
}
