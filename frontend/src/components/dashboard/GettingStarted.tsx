import React, { useState } from 'react';
import { BookOpen, Headset, Search, Server, X } from 'lucide-react';

const DISMISSED_KEY = 'central.gettingStarted.dismissed';

const STEPS = [
  {
    icon: Headset,
    title: 'Registre cada atendimento',
    text: 'Anote problema, diagnóstico e solução. O chamado oficial continua no OTRS; aqui fica o "como resolvi".',
    target: 'attendance?new=true',
    action: 'Novo atendimento',
  },
  {
    icon: BookOpen,
    title: 'Transforme soluções em artigos',
    text: 'No detalhe do atendimento, "Gerar artigo" cria um rascunho na Base de Conhecimento para a equipe.',
    target: 'knowledge',
    action: 'Ver a base',
  },
  {
    icon: Server,
    title: 'Mantenha o inventário',
    text: 'Equipamentos cadastrados juntam atendimentos e manutenções na própria ficha.',
    target: 'equipment',
    action: 'Ver equipamentos',
  },
  {
    icon: Search,
    title: 'Busque qualquer coisa',
    text: 'Ctrl+K (ou o botão "Buscar" no topo) acha atendimentos, comandos, artigos e equipamentos.',
    target: null,
    action: null,
  },
] as const;

const readDismissed = () => {
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
};

/** Card de boas-vindas do Início: explica o fluxo da Central em 4 passos. Some ao clicar em "Entendi". */
export const GettingStarted: React.FC<{ onNavigate: (target: string) => void }> = ({ onNavigate }) => {
  const [dismissed, setDismissed] = useState(readDismissed);
  if (dismissed) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // sem armazenamento: some só nesta visita
    }
    setDismissed(true);
  };

  return (
    <section aria-labelledby="getting-started-title" className="relative rounded-xl border border-primary/30 bg-primary/5 p-4">
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-3 top-3 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
        aria-label="Fechar primeiros passos"
      >
        <X className="h-4 w-4" />
      </button>
      <h2 id="getting-started-title" className="text-sm font-bold text-foreground">
        Primeiros passos na Central
      </h2>
      <p className="mt-0.5 text-xs text-muted-foreground">Como a equipe usa o sistema no dia a dia.</p>
      <ol className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <li key={step.title} className="flex gap-3 rounded-lg bg-card/70 p-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground">
                  {i + 1}. {step.title}
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{step.text}</p>
                {step.target && (
                  <button
                    type="button"
                    onClick={() => onNavigate(step.target)}
                    className="mt-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                  >
                    {step.action} →
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <div className="mt-3 text-right">
        <button type="button" onClick={dismiss} className="text-xs font-semibold text-primary hover:underline cursor-pointer">
          Entendi
        </button>
      </div>
    </section>
  );
};
