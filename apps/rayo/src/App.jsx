import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import PisCofinsReviewPage from './pages/PisCofinsReviewPage';
import AuditorIcmsPage from './pages/AuditorIcmsPage';
import ContasRazaoPage from './pages/ContasRazaoPage';
import EstoqueAuditorPage from './pages/EstoqueAuditorPage';
import SubvencoesPage from './pages/SubvencoesPage';
import ConciliacaoNotasPage from './pages/ConciliacaoNotasPage';
import ConciliacaoBancariaPage from './pages/ConciliacaoBancariaPage';
import RetificacaoCodigosPage from './pages/RetificacaoCodigosPage';

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
                <Route path="/conciliacao-notas" element={<ConciliacaoNotasPage />} />
                <Route path="/conciliacao-bancaria" element={<ConciliacaoBancariaPage />} />
                <Route path="/retificacao-codigos" element={<RetificacaoCodigosPage />} />
            </Routes>
        </BrowserRouter>
    );
}
