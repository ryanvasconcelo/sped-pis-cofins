import { Link } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { Moon, Sun, Zap, Search, LayoutDashboard, FileSpreadsheet, FileBox, Landmark } from 'lucide-react';

export default function HomePage() {
    const { theme, toggle } = useTheme();

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
            <header className="sticky top-0 z-50 flex items-center justify-between px-8 py-4 bg-background/80 backdrop-blur-md border-b border-border">
                <div className="flex items-center gap-3">
                    <img src="/logo.png" alt="Rayo" className={`h-8 ${theme === 'dark' ? '' : 'invert-[0.1]'}`} />
                    <span className="text-xl font-display font-extrabold tracking-tight">Rayo Hub</span>
                </div>
                <button onClick={toggle} className="p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                    {theme === 'light' ? <Sun size={18} /> : <Moon size={18} />}
                </button>
            </header>

            <main className="flex-1 w-full max-w-6xl mx-auto p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="mb-12 text-center mt-10">
                    <h1 className="text-5xl font-display font-bold tracking-tight mb-4 text-foreground">
                        Sistema <span className="text-primary">Rayo</span>
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                        Portal central de auditoria e automação contábil/fiscal.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-min">
                    
                    {/* Fiscal Group */}
                    <Link to="/icms" className="group rounded-xl border border-border bg-card hover:border-primary/50 transition-all p-6 shadow-sm hover:shadow-md col-span-1 md:col-span-2 relative overflow-hidden flex flex-col justify-between">
                         <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700"></div>
                         <div>
                            <div className="w-12 h-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                                <Search size={24} />
                            </div>
                            <h2 className="text-2xl font-bold font-display mb-2 text-foreground">Auditor ICMS</h2>
                            <p className="text-muted-foreground mb-6">Cruzamento avançado de dados com regras e-Auditoria e Livrão Alterdata.</p>
                         </div>
                         <div className="font-semibold text-primary flex items-center gap-2 mt-auto text-sm uppercase tracking-wide">
                            Acessar Módulo <Search size={14} className="group-hover:translate-x-1 transition-transform" />
                         </div>
                    </Link>

                    <Link to="/pis-cofins" className="group rounded-xl border border-border bg-card hover:border-accent/50 transition-all p-6 shadow-sm hover:shadow-md relative overflow-hidden flex flex-col justify-between">
                         <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700"></div>
                         <div>
                             <div className="w-12 h-12 bg-accent/10 text-accent rounded-lg flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                                <Zap size={24} />
                             </div>
                             <h2 className="text-xl font-bold font-display mb-2 text-foreground">PIS/COFINS</h2>
                             <p className="text-muted-foreground mb-6 text-sm">Revisão inteligente de NCM e automação SPED.</p>
                         </div>
                         <div className="font-semibold text-accent flex items-center gap-2 mt-auto text-sm uppercase tracking-wide">
                            Acessar Módulo <Zap size={14} className="group-hover:translate-x-1 transition-transform" />
                         </div>
                    </Link>

                    <Link to="/subvencoes" className="group rounded-xl border border-border bg-card hover:border-green-500/50 transition-all p-6 shadow-sm hover:shadow-md col-span-1 md:col-span-2 relative overflow-hidden flex flex-col justify-between">
                         <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700"></div>
                         <div>
                             <div className="w-12 h-12 bg-green-500/10 text-green-500 rounded-lg flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                                <FileSpreadsheet size={24} />
                             </div>
                             <h2 className="text-2xl font-bold font-display mb-2 text-foreground">Subvenções ZFM </h2>
                             <p className="text-muted-foreground mb-6">Apuração automática de ICMS Desonerado (Convênio 65/88). Cruzamento SPED × XML.</p>
                         </div>
                         <div className="font-semibold text-green-500 flex items-center gap-2 mt-auto text-sm uppercase tracking-wide">
                            Acessar Módulo <Search size={14} className="group-hover:translate-x-1 transition-transform" />
                         </div>
                    </Link>

                    {/* Contábil Group */}
                    <Link to="/contas-razao" className="group rounded-xl border border-border bg-card hover:border-indigo-500/50 transition-all p-6 shadow-sm hover:shadow-md relative overflow-hidden flex flex-col justify-between">
                         <div>
                             <div className="w-12 h-12 bg-indigo-500/10 text-indigo-500 rounded-lg flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                                <LayoutDashboard size={24} />
                             </div>
                             <h2 className="text-xl font-bold font-display mb-2 text-foreground">Contas e Razão</h2>
                             <p className="text-muted-foreground mb-6 text-sm">Conciliação automática entre Razão Contábil (NBS) e Sifin.</p>
                         </div>
                         <div className="font-semibold text-indigo-500 flex items-center gap-2 mt-auto text-sm uppercase tracking-wide">
                            Acessar Módulo <Search size={14} className="group-hover:translate-x-1 transition-transform" />
                         </div>
                    </Link>

                    <Link to="/stock" className="group rounded-xl border border-border bg-card hover:border-orange-500/50 transition-all p-6 shadow-sm hover:shadow-md relative overflow-hidden flex flex-col justify-between">
                         <div>
                             <div className="w-12 h-12 bg-orange-500/10 text-orange-500 rounded-lg flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                                <FileBox size={24} />
                             </div>
                             <h2 className="text-xl font-bold font-display mb-2 text-foreground">Estoque</h2>
                             <p className="text-muted-foreground mb-6 text-sm">Comparativo Estoque × Razão por chassi.</p>
                         </div>
                         <div className="font-semibold text-orange-500 flex items-center gap-2 mt-auto text-sm uppercase tracking-wide">
                            Acessar Módulo <Search size={14} className="group-hover:translate-x-1 transition-transform" />
                         </div>
                    </Link>

                    <Link to="/conciliacao-notas" className="group rounded-xl border border-border bg-card hover:border-blue-500/50 transition-all p-6 shadow-sm hover:shadow-md relative overflow-hidden flex flex-col justify-between">
                         <div>
                             <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-lg flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                                <FileSpreadsheet size={24} />
                             </div>
                             <h2 className="text-xl font-bold font-display mb-2 text-foreground">Conciliação de Notas</h2>
                             <p className="text-muted-foreground mb-6 text-sm">Razão NBS × Relatório Sankhya (Nº Nota).</p>
                         </div>
                         <div className="font-semibold text-blue-500 flex items-center gap-2 mt-auto text-sm uppercase tracking-wide">
                            Acessar Módulo <Search size={14} className="group-hover:translate-x-1 transition-transform" />
                         </div>
                    </Link>

                     <Link to="/conciliacao-bancaria" className="group rounded-xl border border-border bg-card hover:border-sky-500/50 transition-all p-6 shadow-sm hover:shadow-md relative overflow-hidden flex flex-col justify-between">
                         <div>
                             <div className="w-12 h-12 bg-sky-500/10 text-sky-500 rounded-lg flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                                <Landmark size={24} />
                             </div>
                             <h2 className="text-xl font-bold font-display mb-2 text-foreground">Conciliação Bancária</h2>
                             <p className="text-muted-foreground mb-6 text-sm">Razão Interno × Saldo da Conta com Netting automático de estornos.</p>
                         </div>
                         <div className="font-semibold text-sky-500 flex items-center gap-2 mt-auto text-sm uppercase tracking-wide">
                            Acessar Módulo <Search size={14} className="group-hover:translate-x-1 transition-transform" />
                         </div>
                    </Link>

                </div>
            </main>

            <footer className="py-6 text-center text-sm text-muted-foreground border-t border-border mt-auto">
                &copy; 2026 Rayo Hub — Integridade Tecnológica Profunda
            </footer>
        </div>
    );
}
