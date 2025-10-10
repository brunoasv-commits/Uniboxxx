import React from 'react';
import { Page } from '../App';

interface TabNavigationProps {
  pages: Page[];
  activePage: Page;
  setActivePage: (page: Page) => void;
}

const TabNavigation: React.FC<TabNavigationProps> = ({ pages, activePage, setActivePage }) => {
  return (
    <nav
      role="tablist"
      aria-label="Navegação da seção"
      className="tabs-container mb-6"
    >
      {pages.map((page) => (
        <button
          key={page}
          role="tab"
          aria-selected={activePage === page}
          aria-controls={`panel-${page.replace(/\s+/g, '-')}`}
          onClick={() => setActivePage(page)}
          className="tab-button"
        >
          {page}
        </button>
      ))}
    </nav>
  );
};

export default TabNavigation;
