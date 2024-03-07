type Logger = {
  log: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
};

interface HeartbeatCollection {
  _id: string;
  userId: string;
  createdAt: Date;
}

declare module "meteor/bboyredstar:stale-session" {
  export class StaleSessionClient {
    constructor(logger?: Logger);
    run: () => void;
  }
  export class StaleSessionServer {
    constructor(logger?: Logger);
    run: () => Promise<void>;
    getCollection: () => Mongo.Collection<HeartbeatCollection>;
  }
}
