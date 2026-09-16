export class Snowflake {
    private sequence = 0;
    private lastTimestamp = -1;

    constructor(
        private readonly workerID: number = 1,
        private readonly epoch = 1651440000000
    ) {}

    public generate() {
        let timestamp = Date.now();

        // A clock that moved backward - an NTP correction, a paused VM
        // resuming - must not reissue an id already minted at this
        // timestamp/sequence pair, so wait for real time to catch back up
        // rather than trust Date.now() at face value.
        if (timestamp < this.lastTimestamp) {
            timestamp = this.waitNextMillis(this.lastTimestamp);
        }

        if (timestamp === this.lastTimestamp) {
            this.sequence = (this.sequence + 1) & 0xfff;
            if (this.sequence === 0) {
                timestamp = this.waitNextMillis(timestamp);
            }
        } else {
            this.sequence = 0;
        }

        this.lastTimestamp = timestamp;

        return (
            (BigInt(timestamp - this.epoch) << BigInt(22)) |
            // Masked to the 10-bit field `decode()` reads it back from - an
            // out-of-range workerID would otherwise bleed into the
            // timestamp bits directly above it, corrupting both.
            (BigInt(this.workerID & 0x3ff) << BigInt(12)) |
            BigInt(this.sequence)
        );
    }

    public decode(snowflake: bigint | string) {
        const id = BigInt(snowflake);

        return {
            timestamp: Number((id >> BigInt(22)) + BigInt(this.epoch)),
            workerID: Number((id >> BigInt(12)) & 0x3ffn),
            sequence: Number(id & 0xfffn)
        };
    }

    static decode(snowflake: bigint | string, epoch = 1651440000000) {
        const id = BigInt(snowflake);

        return {
            timestamp: Number((id >> BigInt(22)) + BigInt(epoch)),
            workerID: Number((id >> BigInt(12)) & 0x3ffn),
            sequence: Number(id & 0xfffn)
        };
    }

    getDate(snowflake: bigint | string): Date {
        return new Date(this.decode(snowflake).timestamp);
    }

    public isValid(snowflake: bigint | string): boolean {
        try {
            const id = BigInt(snowflake);
            const { timestamp } = this.decode(id);
            return timestamp >= this.epoch && timestamp <= Date.now();
        } catch {
            return false;
        }
    }

    private waitNextMillis(currentTimestamp: number) {
        let timestamp = Date.now();
        while (timestamp <= currentTimestamp) {
            timestamp = Date.now();
        }
        return timestamp;
    }
}
