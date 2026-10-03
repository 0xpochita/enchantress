export class UnknownMarketError extends Error {
  constructor(venue: string, assetSymbol: string) {
    super(`${venue} has no ${assetSymbol} market`);
    this.name = "UnknownMarketError";
  }
}
