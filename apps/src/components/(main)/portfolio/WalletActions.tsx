"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ArrowDownToLine, ArrowUpFromLine, Check, Copy, X } from "lucide-react";
import { useState } from "react";
import { isAddress, parseUnits } from "viem";
import { buttonClassName, CryptoIcon, Modal } from "@/components/ui";
import { originChainById } from "@/config/chains";
import { useSignTransfer } from "@/features/bridge";
import type {
  ChainGroup,
  WalletRow,
} from "@/features/portfolio/utils/wallet-rows";
import { useSession } from "@/features/wallet";
import type { Chain } from "@/types/market";
import { cleanAmountInput } from "@/utils/amount-input";
import { formatAmount, formatUsd } from "@/utils/format";

const GAS_RESERVE: Record<string, number> = { MON: 0.1, ETH: 0.0005 };
const FIELD =
  "w-full rounded-md border border-line bg-surface-raised px-3 py-2.5 text-sm outline-none focus:border-ink-subtle";

interface SendOption {
  key: string;
  chain: Chain;
  row: WalletRow;
}

function sendOptions(groups: ChainGroup[]): SendOption[] {
  return groups.flatMap((g) =>
    g.rows.map((row) => ({ key: row.key, chain: g.chain, row })),
  );
}

const MAX_DECIMALS = 6;

function maxSendable(row: WalletRow): number {
  const reserve = row.address === null ? (GAS_RESERVE[row.symbol] ?? 0) : 0;
  const places = 10 ** Math.min(MAX_DECIMALS, row.decimals);
  return Math.max(0, Math.floor((row.amount - reserve) * places) / places);
}

function toMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "The transfer did not go through.";
}

function explorerTx(chainId: string, hash: string): string {
  const base = originChainById(chainId)?.chain.blockExplorers?.default.url;
  return `${base ?? "https://monadscan.com"}/tx/${hash}`;
}

function ModalHeader({
  title,
  onClose,
}: {
  title: string;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 className="text-lg font-light">{title}</h2>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="flex size-8 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink"
      >
        <X aria-hidden className="size-4" />
      </button>
    </div>
  );
}

function ReceiveModal({
  isOpen,
  onClose,
  chains,
}: {
  isOpen: boolean;
  onClose: () => void;
  chains: Chain[];
}) {
  const { address } = useSession();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
  };
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      label="Deposit to your wallet"
      size="md"
    >
      <div className="flex flex-col gap-5 p-6">
        <ModalHeader title="Deposit to your wallet" onClose={onClose} />
        <p className="text-sm text-ink-muted">
          Send tokens to this address from an exchange or another wallet. It is
          the same address on every supported network.
        </p>
        <button
          type="button"
          onClick={copy}
          className={`${FIELD} flex items-center gap-3 text-left font-mono break-all`}
        >
          <span className="flex-1">
            {address ?? "Log in to see your address"}
          </span>
          {copied ? (
            <Check aria-hidden className="size-4 shrink-0 text-positive" />
          ) : (
            <Copy aria-hidden className="size-4 shrink-0" />
          )}
          <span className="sr-only">{copied ? "Copied" : "Copy address"}</span>
        </button>
        <div className="flex flex-wrap gap-2">
          {chains.map((chain) => (
            <span
              key={chain.id}
              className="flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-xs text-ink-muted"
            >
              <CryptoIcon iconKey={chain.iconKey} label="" size={14} />
              {chain.name}
            </span>
          ))}
        </div>
        <p className="text-xs text-ink-subtle">
          Only send from these networks. Tokens sent on other networks can be
          lost.
        </p>
      </div>
    </Modal>
  );
}

function useSendForm(options: SendOption[]) {
  const [key, setKey] = useState(options[0]?.key ?? "");
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const option = options.find((o) => o.key === key) ?? options[0];
  const max = option ? maxSendable(option.row) : 0;
  const value = Number(amount) || 0;
  const error = !option
    ? "No tokens to withdraw yet."
    : recipient && !isAddress(recipient)
      ? "Enter a valid wallet address starting with 0x."
      : value > max
        ? `You can send up to ${formatAmount(max)} ${option.row.symbol}.`
        : undefined;
  const ready = Boolean(option) && value > 0 && isAddress(recipient) && !error;
  return {
    key,
    setKey,
    amount,
    setAmount,
    recipient,
    setRecipient,
    option,
    max,
    error,
    ready,
  };
}

type SendForm = ReturnType<typeof useSendForm>;

function useSend(form: SendForm, onSent: (hash: string) => void) {
  const signTransfer = useSignTransfer();
  const queries = useQueryClient();
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<string>();
  const send = async () => {
    const option = form.option;
    if (!option || !form.ready) return;
    setSending(true);
    setFailure(undefined);
    try {
      const hash = await signTransfer({
        chainId: originChainById(option.chain.id)?.chain.id ?? 0,
        tokenAddress: option.row.address,
        depositAddress: form.recipient,
        amountInBase: parseUnits(form.amount, option.row.decimals).toString(),
        memo: null,
      });
      await queries.invalidateQueries({ queryKey: ["balances"] });
      await queries.invalidateQueries({ queryKey: ["origin-balances"] });
      onSent(hash);
    } catch (error) {
      setFailure(toMessage(error));
    } finally {
      setSending(false);
    }
  };
  return { send, sending, failure };
}

const BOX =
  "flex flex-col gap-2 rounded-xl border border-line bg-surface-raised px-4 py-3 transition-colors focus-within:border-ink-subtle";

function TokenOption({
  option,
  selected,
  onSelect,
}: {
  option: SendOption;
  selected: boolean;
  onSelect: () => void;
}) {
  const { row, chain } = option;
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5 text-left transition-colors hover:bg-surface-hover aria-pressed:border-ink-subtle aria-pressed:bg-surface-raised"
    >
      <CryptoIcon
        iconKey={row.iconKey}
        label=""
        badgeIconKey={chain.iconKey}
        size={28}
      />
      <span className="flex flex-1 flex-col">
        <span className="text-sm font-medium">{row.symbol}</span>
        <span className="text-xs text-ink-muted">on {chain.name}</span>
      </span>
      <span className="flex flex-col items-end text-sm tabular-nums">
        {formatAmount(row.amount)}
        <span className="text-xs text-ink-muted">
          {formatUsd(row.valueUsd)}
        </span>
      </span>
      {selected && <Check aria-hidden className="size-4 text-positive" />}
    </button>
  );
}

function TokenList({
  form,
  options,
}: {
  form: SendForm;
  options: SendOption[];
}) {
  return (
    <fieldset className="flex max-h-56 flex-col gap-2 overflow-y-auto">
      <legend className="sr-only">Token to withdraw</legend>
      {options.map((option) => (
        <TokenOption
          key={option.key}
          option={option}
          selected={option.key === form.option?.key}
          onSelect={() => form.setKey(option.key)}
        />
      ))}
    </fieldset>
  );
}

function AmountBox({ form }: { form: SendForm }) {
  const row = form.option?.row;
  const price = row && row.amount > 0 ? row.valueUsd / row.amount : 0;
  return (
    <label className={BOX}>
      <span className="flex items-center justify-between text-xs text-ink-muted">
        Amount
        <span className="flex items-center gap-2">
          {row && `Available ${formatAmount(form.max)}`}
          <button
            type="button"
            onClick={() => form.setAmount(String(form.max))}
            className="font-medium text-brand hover:underline"
          >
            Max
          </button>
        </span>
      </span>
      <span className="flex items-center gap-3">
        <input
          inputMode="decimal"
          placeholder="0.00"
          value={form.amount}
          onChange={(e) =>
            form.setAmount(cleanAmountInput(e.target.value, row?.decimals))
          }
          className="w-full min-w-0 bg-transparent text-3xl font-light outline-none placeholder:text-ink-subtle"
        />
        <span className="text-sm font-medium text-ink-muted">
          {row?.symbol}
        </span>
      </span>
      <span className="text-xs text-ink-subtle tabular-nums">
        ≈ {formatUsd((Number(form.amount) || 0) * price)}
      </span>
    </label>
  );
}

function SendFields({
  form,
  options,
}: {
  form: SendForm;
  options: SendOption[];
}) {
  return (
    <>
      <TokenList form={form} options={options} />
      <AmountBox form={form} />
      <label className={BOX}>
        <span className="text-xs text-ink-muted">Send to</span>
        <input
          placeholder="0x..."
          spellCheck={false}
          value={form.recipient}
          onChange={(e) => form.setRecipient(e.target.value.trim())}
          className="w-full bg-transparent font-mono text-sm outline-none placeholder:text-ink-subtle"
        />
      </label>
    </>
  );
}

function SendModal({
  isOpen,
  onClose,
  options,
}: {
  isOpen: boolean;
  onClose: () => void;
  options: SendOption[];
}) {
  const form = useSendForm(options);
  const [hash, setHash] = useState<string>();
  const { send, sending, failure } = useSend(form, setHash);
  const close = () => {
    setHash(undefined);
    onClose();
  };
  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      label="Withdraw from your wallet"
      size="md"
    >
      <div className="flex flex-col gap-4 p-6">
        <ModalHeader title="Withdraw from your wallet" onClose={close} />
        {hash && form.option ? (
          <SentNotice
            hash={hash}
            chainId={form.option.chain.id}
            onDone={close}
          />
        ) : (
          <>
            <SendFields form={form} options={options} />
            {(form.error ?? failure) && (
              <p role="alert" className="text-xs text-negative">
                {form.error ?? failure}
              </p>
            )}
            <p className="text-xs text-ink-subtle">
              Double check the address. Transfers cannot be reversed, and the
              receiving wallet must be on the same network.
            </p>
            <button
              type="button"
              disabled={!form.ready || sending}
              onClick={send}
              className={buttonClassName("primary", "w-full py-3 text-sm")}
            >
              {sending ? "Confirm in your wallet" : "Withdraw"}
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}

function SentNotice({
  hash,
  chainId,
  onDone,
}: {
  hash: string;
  chainId: string;
  onDone: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-ink-muted">Your transfer was sent.</p>
      <a
        href={explorerTx(chainId, hash)}
        target="_blank"
        rel="noreferrer"
        className="font-mono text-xs text-brand break-all hover:underline"
      >
        {hash}
      </a>
      <button
        type="button"
        onClick={onDone}
        className={buttonClassName("primary", "w-full py-3 text-sm")}
      >
        Done
      </button>
    </div>
  );
}

export function WalletActions({
  groups,
  chains,
}: {
  groups: ChainGroup[];
  chains: Chain[];
}) {
  const [open, setOpen] = useState<"receive" | "send">();
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => setOpen("receive")}
        className={buttonClassName(
          "primary",
          "flex items-center gap-1.5 px-3.5 py-1.5 text-sm",
        )}
      >
        <ArrowDownToLine aria-hidden className="size-4" />
        Deposit
      </button>
      <button
        type="button"
        onClick={() => setOpen("send")}
        className={buttonClassName(
          "secondary",
          "flex items-center gap-1.5 px-3.5 py-1.5 text-sm",
        )}
      >
        <ArrowUpFromLine aria-hidden className="size-4" />
        Withdraw
      </button>
      <ReceiveModal
        isOpen={open === "receive"}
        onClose={() => setOpen(undefined)}
        chains={chains}
      />
      <SendModal
        key={open}
        isOpen={open === "send"}
        onClose={() => setOpen(undefined)}
        options={sendOptions(groups)}
      />
    </div>
  );
}
