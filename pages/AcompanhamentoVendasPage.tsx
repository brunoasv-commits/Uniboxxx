import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { Sale, SaleTrackingStatus, ID, Movement, MovementOrigin, Account, Category, ProductStockType, MovementStatus, MovementKind, CategoryType } from '../types';
import Modal from '../components/Modal';
import PageTitle from '../components/ui/PageTitle';
import { X } from 'lucide-react';
import Button from '../components/ui/Button';
import CategoryPicker from '../src/components/pickers/CategoryPicker';

type SaleWithDetails = Sale & {
    productName: string;
    customerName: string;
    productCost: number;
    productStockType?: ProductStockType;
    isPaid: boolean;
    displayStatus: SaleTrackingStatus;
};

const AcompanhamentoPage: React.FC = () => {
    const { state, dispatch } = useData();
    const [filterStatus, setFilterStatus] = useState<'open' | 'completed'>('open');
    const [modalState, setModalState] = useState<{
        purchaseMovementForSale: SaleWithDetails | null;
        trackingCodeForSale: SaleWithDetails | null;
        confirmDeliveryForSale: SaleWithDetails | null;
    }>({
        purchaseMovementForSale: null,
        trackingCodeForSale: null,
        confirmDeliveryForSale: null,
    });
    const [saleToInform, setSaleToInform] = useState<SaleWithDetails | null>(null);

    const salesWithDetails: SaleWithDetails[] = useMemo(() => {
        return state.sales
            .map(sale => {
                const product = state.products.find(p => p.id === sale.productId);
                const customer = state.contacts.find(c => c.id === sale.customerId);
                
                const isPaid = sale.status === SaleTrackingStatus.PagamentoRecebido;

                let displayStatus = sale.status;
                if (isPaid && sale.status !== SaleTrackingStatus.Entregue) {
                    // Infer delivery status based on available data, since payment status took over
                    if (sale.trackingCode || sale.statusTimestamps?.[SaleTrackingStatus.AguardandoEntrega]) {
                        displayStatus = SaleTrackingStatus.AguardandoEntrega;
                    } else if (sale.purchaseMovementId || sale.statusTimestamps?.[SaleTrackingStatus.AguardandoEnvio] || (product?.stockType === ProductStockType.Estoque && sale.statusTimestamps?.[SaleTrackingStatus.ComprarItem])) {
                        displayStatus = SaleTrackingStatus.AguardandoEnvio;
                    } else if (sale.statusTimestamps?.[SaleTrackingStatus.ComprarItem]) {
                        displayStatus = SaleTrackingStatus.ComprarItem;
                    } else {
                        displayStatus = SaleTrackingStatus.VendaRealizada;
                    }
                }

                return {
                    ...sale,
                    productName: product?.name || 'N/A',
                    customerName: customer?.name || 'N/A',
                    productCost: product?.cost || 0,
                    productStockType: product?.stockType,
                    isPaid,
                    displayStatus,
                };
            })
            .filter(sale => {
                const isCompleted = sale.displayStatus === SaleTrackingStatus.Entregue;
                return filterStatus === 'completed' ? isCompleted : !isCompleted;
            })
            .sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());
    }, [state.sales, state.products, state.contacts, filterStatus]);
    
    const closeModal = () => {
        setModalState({ purchaseMovementForSale: null, trackingCodeForSale: null, confirmDeliveryForSale: null });
        setSaleToInform(null);
    }

    const handlePurchaseCreated = (saleId: ID, movementId: ID) => {
        const sale = state.sales.find(s => s.id === saleId);
        if (sale) {
            const updatedSale = { 
                ...sale, 
                status: SaleTrackingStatus.AguardandoEnvio, 
                purchaseMovementId: movementId,
                statusTimestamps: {
                    ...sale.statusTimestamps,
                    [SaleTrackingStatus.ComprarItem]: new Date().toISOString()
                }
            };
            dispatch({ type: 'UPDATE_ITEM', payload: { item: updatedSale, collection: 'sales' } });
        }
        closeModal();
    };

    const handleTrackingAdded = (saleId: ID, trackingCode: string) => {
        const sale = state.sales.find(s => s.id === saleId);
        if (sale) {
            const updatedSale = { 
                ...sale, 
                status: SaleTrackingStatus.AguardandoEntrega, 
                trackingCode,
                statusTimestamps: {
                    ...sale.statusTimestamps,
                    [SaleTrackingStatus.AguardandoEnvio]: new Date().toISOString()
                }
            };
            dispatch({ type: 'UPDATE_ITEM', payload: { item: updatedSale, collection: 'sales' } });
        }
        closeModal();
    };

    const handleDeliveryConfirmed = (saleId: ID) => {
        const sale = state.sales.find(s => s.id === saleId);
        if (sale) {
            const updatedSale = { 
                ...sale, 
                status: SaleTrackingStatus.Entregue,
                statusTimestamps: {
                    ...sale.statusTimestamps,
                    [SaleTrackingStatus.Entregue]: new Date().toISOString()
                }
            };
            dispatch({ type: 'UPDATE_ITEM', payload: { item: updatedSale, collection: 'sales' } });
        }
        closeModal();
    };

    const handleWarehouseInformed = (saleId: ID) => {
        const sale = state.sales.find(s => s.id === saleId);
        if (sale) {
            const updatedSale = { 
                ...sale, 
                status: SaleTrackingStatus.AguardandoEnvio, 
                statusTimestamps: {
                    ...sale.statusTimestamps,
                    [SaleTrackingStatus.ComprarItem]: new Date().toISOString()
                }
            };
            dispatch({ type: 'UPDATE_ITEM', payload: { item: updatedSale, collection: 'sales' } });
        }
        setSaleToInform(null);
    };

    const actions = (
        <div className="inline-flex rounded-full border border-gray-700 p-1 bg-gray-900">
            <Button variant="chip" size="sm" active={filterStatus === 'open'} onClick={() => setFilterStatus('open')}>
                Em Aberto
            </Button>
            <Button variant="chip" size="sm" active={filterStatus === 'completed'} onClick={() => setFilterStatus('completed')}>
                Concluídos
            </Button>
        </div>
    );

    return (
        <div>
            <PageTitle title="Acompanhamento de Vendas" actions={actions} />
            <div className="space-y-4 mt-6">
                {salesWithDetails.length > 0 ? salesWithDetails.map(sale => (
                    <SaleTrackingCard 
                        key={sale.id} 
                        sale={sale}
                        onPurchaseClick={() => setModalState(prev => ({...prev, purchaseMovementForSale: sale}))}
                        onAddTrackingClick={() => setModalState(prev => ({...prev, trackingCodeForSale: sale}))}
                        onConfirmDeliveryClick={() => setModalState(prev => ({...prev, confirmDeliveryForSale: sale}))}
                        onInformWarehouseClick={() => setSaleToInform(sale)}
                    />
                )) : (
                    <div className="text-center p-10 bg-white dark:bg-gray-800 rounded-lg shadow">
                        <p>Nenhuma venda encontrada para este filtro.</p>
                    </div>
                )}
            </div>
            
            {modalState.purchaseMovementForSale && (
                <PurchaseMovementModal 
                    isOpen={!!modalState.purchaseMovementForSale}
                    onClose={closeModal}
                    sale={modalState.purchaseMovementForSale}
                    onSave={handlePurchaseCreated}
                />
            )}

            {modalState.trackingCodeForSale && (
                <TrackingCodeModal 
                    isOpen={!!modalState.trackingCodeForSale}
                    onClose={closeModal}
                    sale={modalState.trackingCodeForSale}
                    onSave={handleTrackingAdded}
                />
            )}

            {modalState.confirmDeliveryForSale && (
                 <Modal isOpen={!!modalState.confirmDeliveryForSale} onClose={closeModal} title="Confirmar Entrega">
                    <p>Deseja confirmar a entrega do produto "<strong>{modalState.confirmDeliveryForSale.productName}</strong>" para o cliente <strong>{modalState.confirmDeliveryForSale.customerName}</strong>?</p>
                    <div className="mt-6 flex justify-end space-x-3">
                        <Button variant="ghost" onClick={closeModal}>Cancelar</Button>
                        <Button variant="success" onClick={() => handleDeliveryConfirmed(modalState.confirmDeliveryForSale!.id)}>Confirmar</Button>
                    </div>
                </Modal>
            )}

            {saleToInform && (
                <Modal isOpen={!!saleToInform} onClose={() => setSaleToInform(null)} title="Confirmar Informação ao Armazém">
                    <p>Confirmar que o armazém foi informado sobre a venda do produto "<strong>{saleToInform.productName}</strong>"?</p>
                    <div className="mt-6 flex justify-end space-x-3">
                        <Button variant="ghost" onClick={() => setSaleToInform(null)}>Cancelar</Button>
                        <Button variant="primary" onClick={() => handleWarehouseInformed(saleToInform.id)}>Confirmar</Button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

// --- Child Components ---

interface SaleTrackingCardProps {
    sale: SaleWithDetails;
    onPurchaseClick: () => void;
    onAddTrackingClick: () => void;
    onConfirmDeliveryClick: () => void;
    onInformWarehouseClick: () => void;
}

const SaleTrackingCard: React.FC<SaleTrackingCardProps> = ({ sale, onPurchaseClick, onAddTrackingClick, onConfirmDeliveryClick, onInformWarehouseClick }) => {
    const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('pt-BR', {timeZone: 'UTC'});
    const productIsStocked = sale.productStockType === ProductStockType.Estoque;

    const stages = productIsStocked ? 
    [
        { id: SaleTrackingStatus.ComprarItem, label: 'Informar ao Armazém', completedLabel: 'Informado ao Armazém' },
        { id: SaleTrackingStatus.AguardandoEnvio, label: 'Aguardando Envio', completedLabel: `À Caminho: ${sale.trackingCode || ''}` },
        { id: SaleTrackingStatus.AguardandoEntrega, label: 'Aguardando Entrega', completedLabel: 'Entregue' },
    ]
    :
    [
        { id: SaleTrackingStatus.ComprarItem, label: 'Comprar o Item', completedLabel: 'Item Comprado' },
        { id: SaleTrackingStatus.AguardandoEnvio, label: 'Aguardando Envio', completedLabel: `À Caminho: ${sale.trackingCode || ''}` },
        { id: SaleTrackingStatus.AguardandoEntrega, label: 'Aguardando Entrega', completedLabel: 'Entregue' },
    ];
    
    const actionsMap: Record<string, () => void> = {
        [SaleTrackingStatus.ComprarItem]: productIsStocked ? onInformWarehouseClick : onPurchaseClick,
        [SaleTrackingStatus.AguardandoEnvio]: onAddTrackingClick,
        [SaleTrackingStatus.AguardandoEntrega]: onConfirmDeliveryClick,
    };
    
    const initialStage = { id: SaleTrackingStatus.VendaRealizada, label: 'Venda Realizada' };

    const getStageStatus = (stageId: SaleTrackingStatus) => {
        if (sale.displayStatus === SaleTrackingStatus.Entregue) return 'completed';

        const stageIdsInOrder: SaleTrackingStatus[] = [SaleTrackingStatus.VendaRealizada, SaleTrackingStatus.ComprarItem, SaleTrackingStatus.AguardandoEnvio, SaleTrackingStatus.AguardandoEntrega, SaleTrackingStatus.Entregue];
        const currentStatusIndex = stageIdsInOrder.indexOf(sale.displayStatus);
        const stageIndex = stageIdsInOrder.indexOf(stageId);

        if (stageIndex < currentStatusIndex) return 'completed';
        if (stageIndex === currentStatusIndex) return 'active';
        return 'pending';
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <p className="font-bold text-lg">{sale.productName}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Cliente: {sale.customerName} | Data: {formatDate(sale.saleDate)}</p>
                </div>
                 <div className="flex items-center gap-2">
                    {sale.isPaid && sale.displayStatus !== SaleTrackingStatus.Entregue && (
                        <div className="bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300 text-sm font-medium px-3 py-1 rounded-full">
                            Pag. Recebido
                        </div>
                    )}
                    {sale.displayStatus === SaleTrackingStatus.Entregue && (
                        <div className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 text-sm font-bold px-3 py-1 rounded-full">
                            Concluído
                        </div>
                    )}
                </div>
            </div>
            <div className="flex items-start space-x-2 md:space-x-4">
                 <Stage 
                    label={initialStage.label} 
                    status={getStageStatus(initialStage.id)}
                    timestamp={sale.statusTimestamps?.[SaleTrackingStatus.VendaRealizada]}
                    orderCode={sale.orderCode}
                />

                {stages.map((stage) => {
                     const stageStatus = getStageStatus(stage.id);
                     const isCompleted = stageStatus === 'completed';
                     
                     const timestampKey = stage.id === SaleTrackingStatus.AguardandoEntrega && isCompleted 
                        ? SaleTrackingStatus.Entregue 
                        : stage.id;

                     return (
                        <React.Fragment key={stage.id}>
                            <div className="flex-1 h-0.5 bg-gray-300 dark:bg-gray-600 mt-5"></div>
                            <Stage
                                label={isCompleted ? stage.completedLabel : stage.label}
                                status={stageStatus}
                                action={stageStatus === 'active' ? actionsMap[stage.id] : undefined}
                                timestamp={sale.statusTimestamps?.[timestampKey]}
                            />
                        </React.Fragment>
                    )
                })}
            </div>
        </div>
    );
};

const Stage: React.FC<{ label: string; status: 'completed' | 'active' | 'pending'; timestamp?: string; action?: () => void; orderCode?: string; }> = ({ label, status, timestamp, action, orderCode }) => {
    const baseClasses = "flex items-center justify-center p-2 rounded-lg text-xs md:text-sm text-center transition-colors duration-300 min-h-[50px] w-full";
    const statusClasses = {
        completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
        active: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 ring-2 ring-blue-500",
        pending: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
    };

    const formatTimestamp = (isoString?: string) => {
        if (!isoString) return '';
        return new Date(isoString).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className="flex flex-col items-center flex-1">
             <div className={`${baseClasses} ${statusClasses[status]}`}>
                <div className="flex-1 text-center">
                    <span>{label}</span>
                    {orderCode && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono">#{orderCode}</div>
                    )}
                </div>
                {action && (
                    <button onClick={action} className="ml-2 bg-blue-500 text-white rounded-full w-5 h-5 flex-shrink-0 flex items-center justify-center text-sm hover:bg-blue-600">+</button>
                )}
            </div>
            {timestamp && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {formatTimestamp(timestamp)}
                </div>
            )}
        </div>
    );
}

// --- Modals ---

interface PurchaseMovementModalProps {
    isOpen: boolean;
    onClose: () => void;
    sale: Sale & { productCost: number, productName: string, customerName: string };
    onSave: (saleId: ID, movementId: ID) => void;
}
const PurchaseMovementModal: React.FC<PurchaseMovementModalProps> = ({ isOpen, onClose, sale, onSave }) => {
    const { state, dispatch, generateId } = useData();
    const [formData, setFormData] = useState({
        accountId: '',
        categoryId: '',
        value: sale.productCost * sale.quantity,
        dueDate: new Date().toISOString().split('T')[0],
    });
    const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);

    const accounts = state.accounts.filter(a => a.type !== 'Investimento');
    const selectedCategory = useMemo(() => state.categories.find(c => c.id === formData.categoryId), [state.categories, formData.categoryId]);
    const product = state.products.find(p => p.id === sale.productId);
    const description = `Compra de Produto - ${product?.sku || 'N/A'}`;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!formData.accountId || !formData.categoryId || formData.value <= 0) {
            alert("Preencha todos os campos obrigatórios.");
            return;
        }

        const newMovement: Movement = {
            id: generateId(),
            kind: MovementKind.DESPESA,
            status: MovementStatus.EmAberto,
            origin: MovementOrigin.Produto,
            description: description,
            amountGross: formData.value,
            fees: 0,
            amountNet: formData.value,
            dueDate: formData.dueDate,
            accountId: formData.accountId,
            categoryId: formData.categoryId,
        };

        try {
            dispatch({ type: 'ADD_ITEM', payload: { item: newMovement, collection: 'movements' } });
            onSave(sale.id, newMovement.id);
        } catch (error) {
            console.error("Failed to create movement:", error);
            alert("Falha ao criar movimento de compra.");
        }
    };
    
    if (!isOpen) return null;

    const card = "rounded-2xl bg-gray-900/60 border border-white/10";
    const label = "text-xs text-gray-300 mb-1 block";
    const input = "w-full h-10 rounded-xl bg-white/5 border border-white/10 px-3 text-sm text-gray-100 placeholder:text-gray-500 outline-none focus:ring-2 focus:ring-sky-600";
    const disabledInput = `${input} disabled:opacity-60`;
    const sectionTitle = "text-sm font-semibold text-gray-200";

    return (
         <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center bg-black/60">
            <div className="relative w-full max-w-3xl rounded-2xl bg-[#0b0f1a] shadow-2xl">
                <form onSubmit={handleSubmit}>
                    <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                        <h3 className="text-lg font-semibold text-gray-100">Registrar Compra do Item</h3>
                        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-200"><X size={18} /></button>
                    </div>

                    <div className="max-h-[70vh] overflow-y-auto px-5 py-5 space-y-5">
                        <section className={`${card} p-4`}>
                            <div className={sectionTitle}>Informações</div>
                            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><label className={label}>Tipo</label><input disabled value="Pagar" className={disabledInput} /></div>
                                <div><label className={label}>Status</label><input disabled value="Pendente" className={disabledInput} /></div>
                                <div className="md:col-span-2"><label className={label}>Descrição</label><input disabled value={description} className={disabledInput} /></div>
                            </div>
                        </section>

                        <section className={`${card} p-4`}>
                            <div className={sectionTitle}>Valores & Vencimento</div>
                            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><label className={label}>Valor da Compra *</label><input type="number" value={formData.value} onChange={e => setFormData(p => ({...p, value: parseFloat(e.target.value)}))} className={input} step="0.01" required /></div>
                                <div><label className={label}>Data de Vencimento *</label><input type="date" value={formData.dueDate} onChange={e => setFormData(p => ({...p, dueDate: e.target.value}))} className={input} required /></div>
                            </div>
                        </section>

                        <section className={`${card} p-4`}>
                            <div className={sectionTitle}>Contabilização</div>
                            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className={label}>Conta de Débito *</label>
                                    <select value={formData.accountId} onChange={e => setFormData(p => ({...p, accountId: e.target.value}))} className={input} required>
                                        <option value="">Selecione...</option>
                                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={label}>Categoria da Despesa *</label>
                                    <div className="flex gap-2">
                                        <input
                                            value={selectedCategory?.name || ''}
                                            readOnly
                                            placeholder="Selecione uma categoria"
                                            className={input}
                                            onClick={() => setIsCategoryPickerOpen(true)}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setIsCategoryPickerOpen(true)}
                                            className="shrink-0 rounded-xl border border-white/10 px-3 h-10 text-sm text-gray-200 hover:bg-white/5"
                                        >
                                            Pesquisar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>

                    <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-white/10 bg-[#0b0f1a]/95 px-5 py-4 backdrop-blur">
                        <Button variant="ghost" type="button" onClick={onClose}>Cancelar</Button>
                        <Button variant="primary" type="submit">Criar Movimento</Button>
                    </div>
                </form>
                {isCategoryPickerOpen && (
                    <CategoryPicker
                        isOpen={isCategoryPickerOpen}
                        onClose={() => setIsCategoryPickerOpen(false)}
                        onSelect={(category) => {
                            setFormData(p => ({ ...p, categoryId: category.id }));
                            setIsCategoryPickerOpen(false);
                        }}
                        categoryType={CategoryType.Despesa}
                    />
                )}
            </div>
        </div>
    );
}

interface TrackingCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    sale: Sale;
    onSave: (saleId: ID, trackingCode: string) => void;
}
const TrackingCodeModal: React.FC<TrackingCodeModalProps> = ({ isOpen, onClose, sale, onSave }) => {
    const [code, setCode] = useState(sale.trackingCode || '');
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(!code) return;
        onSave(sale.id, code);
    }
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Adicionar Código de Rastreio">
             <form onSubmit={handleSubmit} className="space-y-4">
                 <input type="text" value={code} onChange={e => setCode(e.target.value)} placeholder="Código de Rastreio" className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600" required />
                 <div className="mt-6 flex justify-end space-x-3">
                    <Button variant="ghost" type="button" onClick={onClose}>Cancelar</Button>
                    <Button variant="primary" type="submit">Salvar</Button>
                </div>
             </form>
        </Modal>
    )
}

export default AcompanhamentoPage;