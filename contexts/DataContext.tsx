import React, { createContext, useReducer, useContext, ReactNode, useEffect, useMemo } from 'react';
import { AppState, Action, ID, MovementKind, CategoryType, Movement, PartnerInvestment, MovementStatus, PartnerInvestmentTxnType, MovementOrigin, SaleTrackingStatus, Sale } from '../types';
import useLocalStorage from '../hooks/useLocalStorage';

export const initialState: AppState = {
  contacts: [],
  categories: [],
  accounts: [],
  products: [],
  sales: [],
  passwords: [],
  companyProfile: [],
  partnerAccounts: [],
  partnerInvestments: [],
  movements: [],
  settlements: [],
  stockPurchases: [],
  warehouseStock: [],
};

const DataContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
  generateId: () => ID;
}>({
  state: initialState,
  dispatch: () => null,
  generateId: () => '',
});

const ensureMovementIntegrity = (movement: any): any => {
    const m = { ...movement };
    
    if (typeof m.grossValue === 'number' && typeof m.amountGross !== 'number') {
        m.amountGross = m.grossValue;
        delete m.grossValue;
    }

    // Ensure amountNet is always correctly calculated including interest
    if (typeof m.amountGross === 'number') {
        m.amountNet = m.amountGross - (m.fees || 0) + (m.interest || 0);
    }
    
    if (m.type) {
        if (m.type === 'Receber') m.kind = MovementKind.RECEITA;
        else if (m.type === 'Pagar') m.kind = MovementKind.DESPESA;
        else if (m.type === 'Transferência') m.kind = MovementKind.TRANSFERENCIA;
        delete m.type;
    }

    if (m.status === 'Baixado' && !m.paidDate) {
        m.paidDate = new Date().toISOString().slice(0, 10);
    }

    return m;
};


const appReducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'ADD_ITEM': {
      const { collection, item } = action.payload;
      const finalItem = collection === 'movements' ? ensureMovementIntegrity(item) : item;
      return {
        ...state,
        [collection]: [...state[collection], finalItem],
      };
    }
    case 'ADD_MULTIPLE_ITEMS': {
      const { collection, items } = action.payload;
      const finalItems = collection === 'movements' ? items.map(ensureMovementIntegrity) : items;
      return {
        ...state,
        [collection]: [...state[collection], ...finalItems],
      };
    }
    case 'UPDATE_ITEM': {
        const { collection, item } = action.payload;
        const finalItem = collection === 'movements' ? ensureMovementIntegrity(item) : item;

        let newMovements = [...state.movements];
        let newPartnerInvestments = [...state.partnerInvestments];
        let newSales = [...state.sales];

        if (collection === 'movements') {
            const index = newMovements.findIndex(i => i.id === finalItem.id);
            if (index !== -1) newMovements[index] = finalItem;
        } else if (collection === 'partnerInvestments') {
            const index = newPartnerInvestments.findIndex(i => i.id === finalItem.id);
            if (index !== -1) newPartnerInvestments[index] = finalItem;
        } else {
            const updatedCollection = state[collection].map((i: any) => (i.id === finalItem.id ? finalItem : i));
            return { ...state, [collection]: updatedCollection };
        }
        
        if (collection === 'movements') {
            const updatedMovement = finalItem as Movement;
            const extraSaleData = (updatedMovement as any)._updatedSaleData;
            
            if (extraSaleData) {
                delete (updatedMovement as any)._updatedSaleData;
            }

            if (updatedMovement.origin === MovementOrigin.Venda && updatedMovement.referenceId) {
                const saleIndex = newSales.findIndex(s => s.id === updatedMovement.referenceId);

                if (saleIndex !== -1) {
                    const saleToUpdate = { ...newSales[saleIndex] };
                    let saleNeedsUpdate = false;
                    
                    // 1. Always update tax from the movement's fees.
                    if (saleToUpdate.tax !== updatedMovement.fees) {
                        saleToUpdate.tax = updatedMovement.fees;
                        saleNeedsUpdate = true;
                    }

                    // 2. Update Freight and Unit Price.
                    // The preferred path is using `extraSaleData` which provides explicit values from the form.
                    if (extraSaleData) {
                        const { freight: newFreight, productValue: newProductValue } = extraSaleData;
                        if (saleToUpdate.freight !== newFreight) {
                            saleToUpdate.freight = newFreight;
                            saleNeedsUpdate = true;
                        }
                        if (saleToUpdate.quantity > 0) {
                            const newUnitPrice = parseFloat((newProductValue / saleToUpdate.quantity).toFixed(2));
                            if (saleToUpdate.unitPrice !== newUnitPrice) {
                                saleToUpdate.unitPrice = newUnitPrice;
                                saleNeedsUpdate = true;
                            }
                        }
                    } else {
                        // Fallback path when `_updatedSaleData` is not provided.
                        // This is less reliable as it has to infer changes from `amountGross`.
                        // It assumes any change in `amountGross` is due to the product value, not freight.
                        const currentSaleGrossAmount = (saleToUpdate.quantity * saleToUpdate.unitPrice) + saleToUpdate.freight;
                        if (Math.abs(currentSaleGrossAmount - updatedMovement.amountGross) > 0.01) {
                            if (saleToUpdate.quantity > 0) {
                                const newUnitPrice = (updatedMovement.amountGross - saleToUpdate.freight) / saleToUpdate.quantity;
                                saleToUpdate.unitPrice = parseFloat(newUnitPrice.toFixed(2));
                                saleNeedsUpdate = true;
                            }
                        }
                    }
                    
                    // 3. Update Sale Status based on Movement Status
                    if (updatedMovement.status === MovementStatus.Baixado && saleToUpdate.status !== SaleTrackingStatus.PagamentoRecebido) {
                        saleToUpdate.status = SaleTrackingStatus.PagamentoRecebido;
                        saleToUpdate.statusTimestamps = { ...saleToUpdate.statusTimestamps, [SaleTrackingStatus.PagamentoRecebido]: updatedMovement.paidDate || new Date().toISOString() };
                        saleNeedsUpdate = true;
                    }

                    if (saleNeedsUpdate) {
                        newSales[saleIndex] = saleToUpdate;
                    }
                }
            }
        }


        const updatedItem = finalItem as Movement | PartnerInvestment;

        if (updatedItem.groupId) {
            const groupId = updatedItem.groupId;

            if (collection === 'movements') {
                const updatedMovement = updatedItem as Movement;
                newPartnerInvestments = newPartnerInvestments.map(inv => {
                    if (inv.groupId === groupId) {
                        return { ...inv, date: updatedMovement.dueDate, amount: updatedMovement.amountGross };
                    }
                    return inv;
                });
            } else if (collection === 'partnerInvestments') {
                const updatedInvestment = updatedItem as PartnerInvestment;
                newPartnerInvestments = newPartnerInvestments.map(inv => {
                    if (inv.groupId === groupId) {
                        return { ...inv, date: updatedInvestment.date, amount: updatedInvestment.amount };
                    }
                    return inv;
                });
                newMovements = newMovements.map(mov => {
                    if (mov.groupId === groupId) {
                        return {
                            ...mov,
                            dueDate: updatedInvestment.date,
                            amountGross: updatedInvestment.amount,
                            amountNet: updatedInvestment.amount,
                            paidDate: mov.status === MovementStatus.Baixado ? updatedInvestment.date : mov.paidDate,
                        };
                    }
                    return mov;
                });
            }
        } 
        else {
            if (collection === 'movements') {
                const updatedMovement = updatedItem as Movement;
                newPartnerInvestments = newPartnerInvestments.map(inv => {
                    if (inv.linkedMovementId === updatedMovement.id) {
                        return { ...inv, date: updatedMovement.dueDate, amount: updatedMovement.amountNet };
                    }
                    return inv;
                });
            } else if (collection === 'partnerInvestments') {
                const updatedInvestment = updatedItem as PartnerInvestment;
                if (updatedInvestment.linkedMovementId) {
                    newMovements = newMovements.map(mov => {
                        if (mov.id === updatedInvestment.linkedMovementId) {
                            return {
                                ...mov,
                                dueDate: updatedInvestment.date,
                                amountGross: updatedInvestment.amount,
                                amountNet: updatedInvestment.amount,
                                paidDate: mov.status === MovementStatus.Baixado ? updatedInvestment.date : mov.paidDate,
                            };
                        }
                        return mov;
                    });
                }
            }
        }
        

        return { ...state, movements: newMovements, partnerInvestments: newPartnerInvestments, sales: newSales };
    }
    case 'DELETE_ITEM': {
        const { collection, id } = action.payload;

        let itemToDelete: Movement | PartnerInvestment | undefined = undefined;

        if (collection === 'movements') {
            itemToDelete = state.movements.find(i => i.id === id);
        } else if (collection === 'partnerInvestments') {
            itemToDelete = state.partnerInvestments.find(i => i.id === id);
        }

        if (itemToDelete?.groupId) {
            const groupId = itemToDelete.groupId;
            return {
                ...state,
                movements: state.movements.filter(m => m.groupId !== groupId),
                partnerInvestments: state.partnerInvestments.filter(inv => inv.groupId !== groupId),
            };
        }

        if (collection === 'partnerInvestments' && (itemToDelete as PartnerInvestment)?.linkedMovementId) {
            const linkedMovementId = (itemToDelete as PartnerInvestment).linkedMovementId;
            return {
                ...state,
                movements: state.movements.filter(m => m.id !== linkedMovementId),
                partnerInvestments: state.partnerInvestments.filter(inv => inv.id !== id),
            };
        }
        
        if (collection === 'movements') {
             return {
                ...state,
                movements: state.movements.filter(m => m.id !== id),
                partnerInvestments: state.partnerInvestments.filter(inv => inv.linkedMovementId !== id),
            };
        }

        return {
            ...state,
            [collection]: state[collection].filter((i: any) => i.id !== id),
        };
    }
    case 'DELETE_MULTIPLE_ITEMS': {
        const { collection, ids } = action.payload;
        const idsSet = new Set(ids);

        const groupIdsToDelete = new Set<string>();
        const linkedMovementIdsToDelete = new Set<string>();
        let hasGroupedItems = false;
        
        if (collection === 'movements') {
            state.movements.filter(m => idsSet.has(m.id)).forEach(m => {
                if (m.groupId) {
                    groupIdsToDelete.add(m.groupId);
                    hasGroupedItems = true;
                }
            });
        } else if (collection === 'partnerInvestments') {
            state.partnerInvestments.filter(inv => idsSet.has(inv.id)).forEach(inv => {
                if (inv.groupId) {
                    groupIdsToDelete.add(inv.groupId);
                    hasGroupedItems = true;
                } else if (inv.linkedMovementId) {
                    linkedMovementIdsToDelete.add(inv.linkedMovementId);
                }
            });
        }
        
        if (hasGroupedItems) {
            return {
                ...state,
                movements: state.movements.filter(m => !m.groupId || !groupIdsToDelete.has(m.groupId)),
                partnerInvestments: state.partnerInvestments.filter(inv => !inv.groupId || !groupIdsToDelete.has(inv.groupId)),
            };
        }

        if (collection === 'partnerInvestments' && linkedMovementIdsToDelete.size > 0) {
            return {
                ...state,
                movements: state.movements.filter(m => !linkedMovementIdsToDelete.has(m.id)),
                partnerInvestments: state.partnerInvestments.filter(inv => !idsSet.has(inv.id)),
            };
        }

        if (collection === 'movements') {
             const finalInvestments = state.partnerInvestments.filter(inv => !inv.linkedMovementId || !idsSet.has(inv.linkedMovementId));
             const finalMovements = state.movements.filter(m => !idsSet.has(m.id));
             return { ...state, movements: finalMovements, partnerInvestments: finalInvestments };
        }

        return {
            ...state,
            [collection]: state[collection].filter((i: any) => !idsSet.has(i.id)),
        };
    }
    case 'REPLACE_COLLECTION': {
      const { collection, items } = action.payload;
      return {
        ...state,
        [collection]: items,
      };
    }
    default:
      return state;
  }
};

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [storedState, setStoredState] = useLocalStorage<AppState>('erp-simples-data', initialState);
  
  const migratedState = useMemo(() => {
    const categories = storedState.categories?.map(cat => {
        // @ts-ignore
        if (cat.type === 'Investimento') {
            return { ...cat, type: CategoryType.Despesa };
        }
        return cat;
    }) || [];
    return { ...storedState, categories };
  }, [storedState]);

  const [state, dispatch] = useReducer(appReducer, migratedState);
  
  useEffect(() => {
      setStoredState(state);
  }, [state, setStoredState]);


  const generateId = (): ID => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  };

  return (
    <DataContext.Provider value={{ state, dispatch, generateId }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext);