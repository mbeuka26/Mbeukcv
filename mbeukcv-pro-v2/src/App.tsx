import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Accueil } from '@/pages/Accueil';
import { IaGenerator } from '@/modes/ia/IaGenerator';
import { ClassicCvBuilder } from '@/modes/classique/ClassicCvBuilder';
import { AtsAnalyzer } from '@/ats/AtsAnalyzer';
import { AutomationPage } from '@/automation/AutomationPage';
import { ParametresPage } from '@/pages/Parametres';
import { useOfferWatch } from '@/adapters/local/offerWatch';
import { startRecoveryWatcher } from '@/services/recoveryWatcher';

export default function App() {
  useOfferWatch();
  useEffect(() => startRecoveryWatcher(), []);

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Accueil />} />
        <Route path="/classique" element={<ClassicCvBuilder />} />
        <Route path="/ia" element={<IaGenerator />} />
        <Route path="/ats" element={<AtsAnalyzer />} />
        <Route path="/recherche" element={<AutomationPage />} />
        <Route path="/parametres" element={<ParametresPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
