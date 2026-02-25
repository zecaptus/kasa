import { useState } from 'react';
import { useIntl } from 'react-intl';
import { inputCls } from '../lib/inputCls';
import { useListBankAccountsQuery } from '../services/bankAccountsApi';
import {
  type TransferCandidateDto,
  type UnifiedTransactionDto,
  useListTransferCandidatesQuery,
  useUpdateTransferPeerMutation,
} from '../services/transactionsApi';
import { Button } from './ui/Button';

interface TransferPeerPickerProps {
  transaction: UnifiedTransactionDto;
}

interface StaticRowProps {
  direction: 'debit' | 'credit' | null;
  peerLabel: string | null;
  onEdit: () => void;
}

function StaticRow({ direction, peerLabel, onEdit }: StaticRowProps) {
  const intl = useIntl();
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-500">
        {intl.formatMessage({ id: 'transactions.transfer.badge' })}
      </span>
      <span className="flex items-center gap-2">
        {peerLabel && (
          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
            {direction === 'debit' ? `→ ${peerLabel}` : `← ${peerLabel}`}
          </span>
        )}
        <button
          type="button"
          onClick={onEdit}
          className="rounded-lg px-2 py-0.5 text-xs font-medium text-kasa-accent transition-colors hover:bg-kasa-accent/10 dark:hover:bg-kasa-accent/15"
        >
          {intl.formatMessage({
            id: peerLabel ? 'transactions.transfer.edit' : 'transactions.transfer.link',
          })}
        </button>
      </span>
    </div>
  );
}

interface CandidateSelectProps {
  txId: string;
  candidates: TransferCandidateDto[];
  selectedPeerId: string;
  onChange: (id: string) => void;
}

function CandidateSelect({
  txId: _txId,
  candidates,
  selectedPeerId,
  onChange,
}: CandidateSelectProps) {
  const intl = useIntl();
  return (
    <select
      value={selectedPeerId}
      onChange={(e) => onChange(e.target.value)}
      className={inputCls(false)}
    >
      <option value="">{intl.formatMessage({ id: 'transactions.transfer.unlink' })}</option>
      {candidates.length === 0 && (
        <option disabled>
          {intl.formatMessage({ id: 'transactions.transfer.candidates.none' })}
        </option>
      )}
      {candidates.map((c) => {
        const linkedNote = c.linkedToAccountLabel
          ? ` [${intl.formatMessage({ id: 'transactions.transfer.already.linked' }, { account: c.linkedToAccountLabel })}]`
          : '';
        const sign = c.direction === 'debit' ? '-' : '+';
        const formatted = intl.formatNumber(c.amount, { style: 'currency', currency: 'EUR' });
        return (
          <option key={c.id} value={c.id}>
            {c.date} · {c.label} · {sign}
            {formatted}
            {linkedNote}
          </option>
        );
      })}
    </select>
  );
}

export function TransferPeerPicker({ transaction }: TransferPeerPickerProps) {
  const intl = useIntl();
  const [isEditing, setIsEditing] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedPeerId, setSelectedPeerId] = useState('');

  const { data: accountsData } = useListBankAccountsQuery(undefined, { skip: !isEditing });
  const { data: candidatesData } = useListTransferCandidatesQuery(
    { id: transaction.id, accountId: selectedAccountId },
    { skip: !isEditing || !selectedAccountId },
  );
  const [updatePeer, { isLoading }] = useUpdateTransferPeerMutation();

  const accounts = (accountsData?.accounts ?? []).filter((a) => a.id !== transaction.accountId);
  const candidates = candidatesData?.candidates ?? [];

  function handleEdit() {
    setSelectedAccountId('');
    setSelectedPeerId(transaction.transferPeerId ?? '');
    setIsEditing(true);
  }

  function handleAccountChange(accountId: string) {
    setSelectedAccountId(accountId);
    setSelectedPeerId('');
  }

  async function handleSave() {
    await updatePeer({ id: transaction.id, transferPeerId: selectedPeerId || null });
    setIsEditing(false);
  }

  if (!isEditing) {
    return (
      <StaticRow
        direction={transaction.direction}
        peerLabel={transaction.transferPeerAccountLabel}
        onEdit={handleEdit}
      />
    );
  }

  return (
    <div className="space-y-2">
      <span className="text-sm text-slate-500">
        {intl.formatMessage({ id: 'transactions.transfer.badge' })}
      </span>

      <select
        value={selectedAccountId}
        onChange={(e) => handleAccountChange(e.target.value)}
        className={inputCls(false)}
      >
        <option value="" disabled>
          {intl.formatMessage({ id: 'transactions.transfer.select.account' })}
        </option>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.label}
          </option>
        ))}
      </select>

      {selectedAccountId && (
        <CandidateSelect
          txId={transaction.id}
          candidates={candidates}
          selectedPeerId={selectedPeerId}
          onChange={setSelectedPeerId}
        />
      )}

      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => void handleSave()}
          disabled={isLoading || !selectedAccountId}
        >
          {intl.formatMessage({ id: 'categories.form.submit.update' })}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
          {intl.formatMessage({ id: 'recurring.edit.cancel' })}
        </Button>
      </div>
    </div>
  );
}
