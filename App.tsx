import React, { useState, useEffect } from 'react';
import { Sidebar } from './layout/Sidebar';
import DashboardPage from './pages/DashboardPage';
import ContactsPage from './pages/ContactsPage';
import ProductsPage from './pages/ProductsPage';
import SalesPage from './pages/SalesPage';
import AccountsPage from './pages/AccountsPage';
import CategoriesPage from './pages/CategoriesPage';
import MovementsPage from './src/pages/movements';
import InvestmentsPage from './pages/InvestmentsPage';
import CreditCardExpensesPage from './src/pages/CreditCardExpenses';
import AcompanhamentoPage from './pages/AcompanhamentoVendasPage';
import { DataProvider } from './contexts/DataContext';
import { AccessProvider } from './src/contexts/AccessProvider';
import InfoContasPage from './src/pages/InfoContas';
import ControleArmazemPage from './pages/ControleArmazemPage';
import TabNavigation from './components/TabNavigation';
import ProductDetailPage from './pages/ProductDetailPage';
import QuickAccessPage from './pages/Home';
import HomePage from './pages/HomePage';
import { ID } from './types';
import AccessPage from './src/pages/Access';
import Login from './src/pages/Auth/Login';
import PasswordsPage from './pages/PasswordsPage';
import CompanyProfilePage from './pages/CompanyProfilePage';
import { isLogged, ensureAdminSeed, logout } from './src/lib/auth';

export type Page = 'Home' | 'Acesso Rápido' | 'Dashboard' | 'Contatos' | 'Todos os Produtos' | 'Vendas' | 'Contas' | 'Categorias' | 'Transações' | 'Investimentos' | 'Despesas do Cartão' | 'Acompanhamento' | 'Info. Contas' | 'Controle de Armazém' | 'Detalhe do Produto' | 'Usuários & Acesso' | 'Senhas' | 'Cadastro Empresa';

export const pageGroups: Record<string, Page[]> = {
  'Produtos': ['Todos os Produtos', 'Vendas', 'Acompanhamento', 'Controle de Armazém'],
  'Cadastros': ['Contatos', 'Contas', 'Categorias'],
};

const findGroupForPage = (page: Page): Page[] | null => {
    for (const groupPages of Object.values(pageGroups)) {
        if (groupPages.includes(page)) {
            return groupPages;
        }
    }
    return null;
}


const App: React.FC = () => {
  const [activePage, setActivePage] = useState<Page>('Home');
  const [viewingProductId, setViewingProductId] = useState<ID | null>(null);

  const [ready, setReady] = useState(false);
  const [logged, setLogged] = useState(false);

  useEffect(() => {
    const initApp = async () => {
      await ensureAdminSeed();
      setLogged(isLogged());
      setReady(true);
    };
    initApp();
  }, []);

  const handleLogout = () => {
    logout();
    setLogged(false);
  };

  if (!ready) {
      return <div className="flex h-screen w-full items-center justify-center bg-gray-900 text-gray-300">Carregando...</div>;
  }
  
  if (!logged) {
      return <Login onLogged={() => {
          setLogged(true);
          // Refresh AccessProvider after login
          window.dispatchEvent(new StorageEvent('storage', { key: 'erp_current_user' }));
      }} />;
  }

  const renderPage = () => {
    switch (activePage) {
      case 'Home':
        return <HomePage />;
      case 'Acesso Rápido':
        return <QuickAccessPage setActivePage={setActivePage} setViewingProductId={setViewingProductId} />;
      case 'Dashboard':
        return <DashboardPage setActivePage={setActivePage} />;
      case 'Contatos':
        return <ContactsPage />;
      case 'Todos os Produtos':
        return <ProductsPage 
            setActivePage={setActivePage} 
            setViewingProductId={setViewingProductId} 
        />;
      case 'Detalhe do Produto':
        return <ProductDetailPage 
            productId={viewingProductId!} 
            onBack={() => setActivePage('Todos os Produtos')} 
            navigateTo={setActivePage}
        />;
      case 'Controle de Armazém':
        return <ControleArmazemPage />;
      case 'Vendas':
        return <SalesPage />;
      case 'Acompanhamento':
        return <AcompanhamentoPage />;
      case 'Contas':
        return <AccountsPage setActivePage={setActivePage} />;
      case 'Info. Contas':
        return <InfoContasPage />;
      case 'Categorias':
        return <CategoriesPage />;
      case 'Transações':
        return <MovementsPage />;
      case 'Investimentos':
        return <InvestmentsPage />;
      case 'Despesas do Cartão':
        return <CreditCardExpensesPage />;
      case 'Senhas':
        return <PasswordsPage />;
      case 'Cadastro Empresa':
        return <CompanyProfilePage />;
      case 'Usuários & Acesso':
        return <AccessPage />;
      default:
        return <HomePage />;
    }
  };
  
  const currentPageGroup = findGroupForPage(activePage);

  return (
    <DataProvider>
      <AccessProvider>
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
          <Sidebar 
            activePage={activePage} 
            setActivePage={setActivePage} 
            onLogout={handleLogout}
          />
          <main className="flex-1 p-6 lg:p-10 overflow-auto">
            {currentPageGroup && (
              <TabNavigation 
                pages={currentPageGroup}
                activePage={activePage}
                setActivePage={setActivePage}
              />
            )}
            {renderPage()}
          </main>
        </div>
      </AccessProvider>
    </DataProvider>
  );
};

export default App;
