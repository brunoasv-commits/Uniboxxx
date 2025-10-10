
import { AppState, Movement, MovementStatus } from '../../../types';
import { Movement as UIMovement } from './types';


export const toUIMovement = (m: Movement, appState: AppState): UIMovement => {
    const category = m.categoryId ? appState.categories.find(c => c.id === m.categoryId) : undefined;
    const account = m.accountId ? appState.accounts.find(a => a.id === m.accountId) : undefined;
    const counterAccount = m.destinationAccountId ? appState.accounts.find(a => a.id === m.destinationAccountId) : undefined;
    
    let uiStatus: UIMovement['status'] = 'PENDENTE';
    if (m.status === MovementStatus.Baixado) uiStatus = 'BAIXADO';
    
    return {
        id: m.id,
        referenceId: m.referenceId,
        description: m.description,
        kind: m.kind,
        status: uiStatus,
        dueDate: m.dueDate,
        paidDate: m.paidDate,
        categoryId: m.categoryId,
        categoryName: category?.name,
        accountId: m.accountId,
        accountName: account?.name,
        counterAccountId: m.destinationAccountId,
        counterAccountName: counterAccount?.name,
        amountGross: m.amountGross,
        fees: m.fees,
        amountNet: m.amountNet,
        installmentNumber: m.installmentNumber,
        totalInstallments: m.totalInstallments,
        groupId: m.groupId
    }
};