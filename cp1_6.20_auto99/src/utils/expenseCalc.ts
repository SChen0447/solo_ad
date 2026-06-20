import type { User, Expense, MemberBalance, SettlementPair } from '../types';

const roundToTwo = (num: number): number => Math.round(num * 100) / 100;

export const calculateMemberBalances = (
  members: User[],
  expenses: Expense[]
): MemberBalance[] => {
  const memberMap = new Map<number, MemberBalance>();
  
  members.forEach(member => {
    memberMap.set(member.id, {
      user: member,
      paid: 0,
      should_pay: 0,
      balance: 0
    });
  });
  
  expenses.forEach(expense => {
    const payer = memberMap.get(expense.paid_by);
    if (payer) {
      payer.paid = roundToTwo(payer.paid + expense.amount);
    }
    
    if (expense.split_type === 'equal') {
      const participantIds = Object.keys(expense.splits).map(Number);
      const share = roundToTwo(expense.amount / participantIds.length);
      
      participantIds.forEach(userId => {
        const member = memberMap.get(userId);
        if (member) {
          member.should_pay = roundToTwo(member.should_pay + share);
        }
      });
    } else {
      Object.entries(expense.splits).forEach(([userIdStr, ratio]) => {
        const userId = Number(userIdStr);
        const member = memberMap.get(userId);
        if (member) {
          const share = roundToTwo(expense.amount * ratio);
          member.should_pay = roundToTwo(member.should_pay + share);
        }
      });
    }
  });
  
  const balances: MemberBalance[] = [];
  memberMap.forEach(balance => {
    balance.balance = roundToTwo(balance.paid - balance.should_pay);
    balances.push(balance);
  });
  
  return balances;
};

export const calculateSettlementPairs = (
  balances: MemberBalance[]
): SettlementPair[] => {
  const debtors = balances.filter(b => b.balance < -0.01).sort((a, b) => a.balance - b.balance);
  const creditors = balances.filter(b => b.balance > 0.01).sort((a, b) => b.balance - a.balance);
  
  const pairs: SettlementPair[] = [];
  let debtorIdx = 0;
  let creditorIdx = 0;
  
  while (debtorIdx < debtors.length && creditorIdx < creditors.length) {
    const debtor = debtors[debtorIdx];
    const creditor = creditors[creditorIdx];
    
    const debtorOwes = Math.abs(debtor.balance);
    const creditorIsOwed = creditor.balance;
    
    const amount = roundToTwo(Math.min(debtorOwes, creditorIsOwed));
    
    if (amount > 0) {
      pairs.push({
        from: debtor.user,
        to: creditor.user,
        amount
      });
    }
    
    debtor.balance = roundToTwo(debtor.balance + amount);
    creditor.balance = roundToTwo(creditor.balance - amount);
    
    if (Math.abs(debtor.balance) <= 0.01) {
      debtorIdx++;
    }
    if (creditor.balance <= 0.01) {
      creditorIdx++;
    }
  }
  
  return pairs;
};

export const calculateExpenseSplits = (
  amount: number,
  participantIds: number[],
  splitType: 'equal' | 'custom',
  customRatios?: Record<string, number>
): Record<string, number> => {
  if (splitType === 'equal') {
    const splits: Record<string, number> = {};
    participantIds.forEach(id => {
      splits[id.toString()] = roundToTwo(amount / participantIds.length);
    });
    return splits;
  } else {
    const splits: Record<string, number> = {};
    if (customRatios) {
      Object.entries(customRatios).forEach(([id, ratio]) => {
        splits[id] = roundToTwo(amount * ratio);
      });
    }
    return splits;
  }
};

export const formatCurrency = (amount: number): string => {
  return `¥${amount.toFixed(2)}`;
};

export const getBalanceColor = (balance: number): string => {
  if (balance > 0.01) return '#38a169';
  if (balance < -0.01) return '#e53e3e';
  return '#718096';
};
