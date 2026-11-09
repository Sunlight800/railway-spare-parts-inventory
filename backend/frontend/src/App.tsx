import React, { useState, useEffect } from 'react';
import { DisclaimerBanner } from './components/layout/DisclaimerBanner';
import { Header } from './components/layout/Header';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { ExecutiveDashboard } from './pages/ExecutiveDashboard';
import { Music3DDashboard } from './pages/Music3DDashboard';
import { InventoryExplorer } from './pages/InventoryExplorer';
import { ClassificationAnalysis } from './pages/ClassificationAnalysis';
import { StockHealthRisk } from './pages/StockHealthRisk';
import { RecommendationsCentre } from './pages/RecommendationsCentre';
import { BlockPlanning } from './pages/BlockPlanning';
import { SimulationStudio } from './pages/SimulationStudio';
import { AssetsSystems } from './pages/AssetsSystems';
import { SuppliersProcurement } from './pages/SuppliersProcurement';
import { DataManagement } from './pages/DataManagement';
import { MethodologyLearning } from './pages/MethodologyLearning';
import { api } from './services/api';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [recommendationsCount, setRecommendationsCount] = useState<number>(0);
  
  // Cross-page navigation state
  const [inventoryInitialSearch, setInventoryInitialSearch] = useState<string>('');
  const [inventoryInitialFilters, setInventoryInitialFilters] = useState<Record<string, string>>({});
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);

  const loadRecommendationCount = () => {
    api.getRecommendations()
      .then((res) => {
        setRecommendationsCount(res.counts?.critical + res.counts?.high || 0);
      })
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    loadRecommendationCount();
  }, []);

  const handleNavigateTab = (tab: NavTab, filterParams?: any) => {
    if (tab === 'inventory' && filterParams) {
      if (filterParams.search) {
        setInventoryInitialSearch(filterParams.search);
      }
      setInventoryInitialFilters(filterParams);
    }
    setCurrentTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectPart = (partId: string) => {
    setSelectedPartId(partId);
    setCurrentTab('inventory');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* Disclaimer Banner */}
      <DisclaimerBanner />

      {/* Main Header */}
      <Header onRefresh={loadRecommendationCount} />

      {/* Main App Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            setCurrentTab(tab);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          recommendationsCount={recommendationsCount}
        />

        {/* Content Area */}
        <main className="flex-1 p-6 overflow-y-auto max-w-[1600px] w-full mx-auto">
          {currentTab === 'dashboard' && (
            <ExecutiveDashboard onNavigateTab={handleNavigateTab} />
          )}
          {currentTab === 'music3d' && (
            <Music3DDashboard onSelectPart={handleSelectPart} />
          )}
          {currentTab === 'inventory' && (
            <InventoryExplorer
              initialSearch={inventoryInitialSearch}
              initialFilters={inventoryInitialFilters}
              selectedPartId={selectedPartId}
              onClearSelectedPart={() => setSelectedPartId(null)}
            />
          )}
          {currentTab === 'classifications' && (
            <ClassificationAnalysis onSelectPart={handleSelectPart} />
          )}
          {currentTab === 'stock-health' && (
            <StockHealthRisk onSelectPart={handleSelectPart} />
          )}
          {currentTab === 'recommendations' && (
            <RecommendationsCentre onSelectPart={handleSelectPart} />
          )}
          {currentTab === 'block-planning' && (
            <BlockPlanning />
          )}
          {currentTab === 'simulation' && (
            <SimulationStudio />
          )}
          {currentTab === 'assets' && (
            <AssetsSystems />
          )}
          {currentTab === 'suppliers' && (
            <SuppliersProcurement />
          )}
          {currentTab === 'data-management' && (
            <DataManagement />
          )}
          {currentTab === 'methodology' && (
            <MethodologyLearning />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
