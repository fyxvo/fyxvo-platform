import type { Connection, TransactionSignature } from "@solana/web3.js";
import {
  BaseWalletAdapter,
  WalletReadyState,
  type SendTransactionOptions,
  type WalletName,
} from "@solana/wallet-adapter-base";

export const SolanaMobileWalletAdapterWalletName =
  "Solana Mobile Wallet" as WalletName<"Solana Mobile Wallet">;

export function createDefaultAddressSelector() {
  return async function selectFirstAddress<T extends { readonly accounts?: readonly unknown[] }>(
    accounts: T,
  ) {
    return Array.isArray(accounts?.accounts) ? accounts.accounts[0] ?? null : null;
  };
}

export function createDefaultAuthorizationResultCache() {
  return {
    async clear() {
      return undefined;
    },
    async get() {
      return null;
    },
    async set() {
      return undefined;
    },
  };
}

export function createDefaultWalletNotFoundHandler() {
  return async function handleWalletNotFound() {
    return undefined;
  };
}

export class SolanaMobileWalletAdapter extends BaseWalletAdapter {
  readonly name = SolanaMobileWalletAdapterWalletName;
  readonly url = "https://solana.com";
  readonly icon =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='16' fill='%230a0f1f'/%3E%3Cpath d='M18 22h28l-5 6H13l5-6Zm0 14h28l-5 6H13l5-6Zm0 14h28l-5 6H13l5-6Z' fill='%233ae374'/%3E%3C/svg%3E";
  readonly supportedTransactionVersions = null;

  get connecting() {
    return false;
  }

  get publicKey() {
    return null;
  }

  get readyState() {
    return WalletReadyState.Unsupported;
  }

  async connect() {
    throw new Error("Solana mobile wallet support is not enabled in this browser build.");
  }

  async disconnect() {
    return undefined;
  }

  async sendTransaction(
    _transaction: never,
    _connection: Connection,
    _options?: SendTransactionOptions,
  ): Promise<TransactionSignature> {
    throw new Error("Solana mobile wallet support is not enabled in this browser build.");
  }
}
