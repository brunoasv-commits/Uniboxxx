// Fix: Export ID type and remove circular import.
export type ID = string;

export enum ContactType {
  Cliente = 'Cliente',
  Fornecedor = 'Fornecedor',
  ParceiroArmazem = 'Parceiros de Armázém',
  Socio = 'Sócio',
}

export interface Contact {
  id: ID;
  name: string;
  type: ContactType;
  email?: string;
  phone?: string;
  notes?: string;
  document?: string;
  address?: string;
  isActive?: boolean;
}

export enum CategoryType {
  Receita = 'Receita',
  Despesa = 'Despesa',
}
export interface Category {
  id: ID;
  name: string;
  type: CategoryType;
  color?: string;
}

export enum AccountType {
  Banco = 'Banco',
  Caixa = 'Caixa',
  Cartao = 'Cartão de Crédito',
  Investimento = 'Investimento',
}
export interface Account {
  id: ID;
  name: string;
  type: AccountType;
  initialBalance: number;
  cardClosingDay?: number; // Day of the month (1-31)
  cardDueDate?: number; // Day of the month (1-31)
  cardLimit?: number;
}

export enum ProductStockType {
  Estoque = 'Estoque',
  VendaSemEstoque = 'Venda sem Estoque',
}

export interface Product {
  id: ID;
  supplierId: ID;
  name: string;
  salePrice: number;
  cost: number;
  tax: number;
  expenseCategoryId: ID;
  isActive: boolean;
  stockType: ProductStockType;
  availableForSale?: boolean;
  defaultWarehouseId?: ID;
  pendingStock?: number;
  link?: string;
  imageUrl?: string;
  sku: string;
  minStock?: number;
  notes?: string;
}

export enum PaymentMethod {
  Pix = 'Pix',
  Dinheiro = 'Dinheiro',
  Cartao = 'Cartão',
  Boleto = 'Boleto',
  Transferencia = 'Transferência',
  Outro = 'Outro',
}
export enum SaleTrackingStatus {
    VendaRealizada = 'Venda Realizada',
    ComprarItem = 'Comprar o Item',
    AguardandoEnvio = 'Aguardando Envio',
    AguardandoEntrega = 'Aguardando Entrega',
    Entregue = 'Entregue',
    PagamentoRecebido = 'Pag. Recebido',
}

export interface Sale {
  id: ID;
  saleDate: string; // YYYY-MM-DD
  productId: ID;
  quantity: number;
  unitPrice: number;
  freight: number;
  tax: number;
  discount: number;
  customerId: ID;
  paymentMethod: PaymentMethod;
  creditAccountId: ID;
  estimatedPaymentDate: string; // YYYY-MM-DD
  trackingCode?: string;
  status: SaleTrackingStatus;
  purchaseMovementId?: ID;
  statusTimestamps?: Partial<Record<SaleTrackingStatus, string>>;
  stockSourceId: string; // ID of the warehouse (WarehouseStock ID)
  additionalCost?: number;
  orderCode?: string;
}

export enum MovementKind {
  RECEITA = 'RECEITA',
  DESPESA = 'DESPESA',
  TRANSFERENCIA = 'TRANSFERENCIA',
}

export enum MovementOrigin {
  Venda = 'Venda',
  Investimento = 'Investimento',
  ReceitaAvulsa = 'Receita avulsa',
  Despesa = 'Despesa',
  Transferencia = 'Transferência',
  Resgate = 'Resgate (Retirada)',
  Produto = 'Compra de Produto',
  Outro = 'Outro',
}
export enum MovementPeriodicity {
  Mensal = 'Mensal',
  Anual = 'Anual',
}
export enum MovementStatus {
  EmAberto = 'Pendente',
  Vencido = 'Vencido',
  Baixado = 'Baixado',
}
export interface Movement {
  id: ID;
  kind: MovementKind;
  origin: MovementOrigin;
  referenceId?: ID; // Sale or Investment ID
  contactId?: ID;
  accountId: ID; // For transfer, this is the source account
  destinationAccountId?: ID; // For transfer, this is the destination account
  categoryId?: ID;
  description: string;
  dueDate: string; // YYYY-MM-DD
  transactionDate?: string; // YYYY-MM-DD for card expenses
  paidDate?: string; // YYYY-MM-DD, when it was settled
  amountGross: number;
  fees: number;
  interest?: number;
  amountNet: number;
  installmentNumber?: number;
  totalInstallments?: number;
  parentMovementId?: ID; // to group installments or transfers
  groupId?: ID;
  status?: MovementStatus;
  attachmentUrl?: string;
}

export interface Settlement {
  id: ID;
  movementId: ID;
  settlementDate: string; // YYYY-MM-DD
  accountId: ID;
  value: number;
  method: PaymentMethod;
  receiptFileName?: string;
  notes?: string;
}

export interface StockPurchase {
  id: ID;
  purchaseDate: string;
  productId: ID;
  quantity: number;
  unitCost: number;
  warehouseId: ID;
  movementId: ID;
}

export interface WarehouseStock {
  id: ID;
  productId: ID;
  warehouseId: ID; // This is a contact ID
  quantity: number;
}

export interface PasswordEntry {
  id: ID;
  site: string;
  email: string;
  password?: string;
  notes?: string;
}

// New Partner Investment Module Types
export interface PartnerAccount {
  id: ID;
  contactId: ID; // Link to a Contact of type 'Socio'
  name: string;
  status: 'Ativo' | 'Inativo';
  createdAt: string; // ISO Date
}

export enum PartnerInvestmentTxnType {
  Aporte = 'APORTE',
  Rendimento = 'RENDIMENTO',
  Resgate = 'RESGATE',
  Transferencia = 'TRANSFERENCIA',
}

export interface PartnerInvestment {
  id: ID;
  partnerAccountId: ID;
  date: string; // YYYY-MM-DD
  type: PartnerInvestmentTxnType;
  amount: number; // Always positive
  note?: string;
  attachmentUrl?: string; // Optional link to a receipt
  contraAccountId?: ID; // For transfers, the company's bank/cash account ID
  linkedMovementId?: ID; // Link to the company's financial movement
  groupId?: ID;
}

export interface PartnerInfo {
  id: ID;
  name: string;
  rg: string;
  cpf: string;
  email: string;
}

export interface CompanyProfile {
  id: ID;
  tradeName: string;
  legalName: string;
  address: string;
  cnpj: string;
  socialContractUrl?: string; // Data URL for the file
  partners: PartnerInfo[];
}

export interface AppState {
  contacts: Contact[];
  categories: Category[];
  accounts: Account[];
  products: Product[];
  sales: Sale[];
  passwords: PasswordEntry[];
  companyProfile: CompanyProfile[];
  partnerAccounts: PartnerAccount[];
  partnerInvestments: PartnerInvestment[];
  movements: Movement[];
  settlements: Settlement[];
  stockPurchases: StockPurchase[];
  warehouseStock: WarehouseStock[];
}

export type Action =
  | { type: 'ADD_ITEM'; payload: { item: any; collection: keyof AppState } }
  | { type: 'UPDATE_ITEM'; payload: { item: any; collection: keyof AppState } }
  | { type: 'DELETE_ITEM'; payload: { id: ID; collection: keyof AppState } }
  | { type: 'DELETE_MULTIPLE_ITEMS'; payload: { ids: ID[]; collection: keyof AppState } }
  | { type: 'ADD_MULTIPLE_ITEMS'; payload: { items: any[]; collection: keyof AppState } }
  | { type: 'REPLACE_COLLECTION'; payload: { items: any[]; collection: keyof AppState } };