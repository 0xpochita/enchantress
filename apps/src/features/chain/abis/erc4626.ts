import { parseAbi } from "viem";

export const erc4626Abi = parseAbi([
  "function asset() view returns (address)",
  "function totalAssets() view returns (uint256)",
  "function convertToAssets(uint256 shares) view returns (uint256)",
  "function convertToShares(uint256 assets) view returns (uint256)",
  "function maxRedeem(address owner) view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function deposit(uint256 assets, address receiver) returns (uint256 shares)",
  "function redeem(uint256 shares, address receiver, address owner) returns (uint256 assets)",
  "event Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares)",
]);
