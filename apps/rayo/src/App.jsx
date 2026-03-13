import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import PisCofinsReviewPage from './pages/PisCofinsReviewPage';
import AuditorIcmsPage from './pages/AuditorIcmsPage';
import ContasRazaoPage from './pages/ContasRazaoPage';
import EstoqueAuditorPage from './pages/EstoqueAuditorPage';
import SubvencoesPage from './pages/SubvencoesPage';

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/pis-cofins" element={<PisCofinsReviewPage />} />
                <Route path="/icms" element={<AuditorIcmsPage />} />
                <Route path="/contas-razao" element={<ContasRazaoPage />} />
                <Route path="/stock" element={<EstoqueAuditorPage />} />
                <Route path="/subvencoes" element={<SubvencoesPage />} />
            </Routes>
        </BrowserRouter>
    );
}
