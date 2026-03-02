import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import PisCofinsReviewPage from './pages/PisCofinsReviewPage';
import AuditorIcmsPage from './pages/AuditorIcmsPage';

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/pis-cofins" element={<PisCofinsReviewPage />} />
                <Route path="/icms" element={<AuditorIcmsPage />} />
            </Routes>
        </BrowserRouter>
    );
}
