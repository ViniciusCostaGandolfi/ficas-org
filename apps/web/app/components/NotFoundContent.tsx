import { Link } from "react-router";

import { SearchIcon } from "./Icons";

export interface NotFoundContentProps {
  title?: string;
  description?: string;
}

export function NotFoundContent({
  title = "Página não encontrada",
  description = "O endereço acessado não existe ou foi movido. Verifique o link ou volte para o início.",
}: NotFoundContentProps) {
  return (
    <div className="surface-mesh flex flex-col items-center gap-4 rounded-3xl border border-base-300/70 px-6 py-20 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-base-100 text-primary shadow-sm">
        <SearchIcon className="h-8 w-8" />
      </span>
      <p className="font-display text-xs font-semibold uppercase tracking-[0.18em] text-primary">
        Não encontramos esta página
      </p>
      <h1 className="font-display text-3xl font-semibold sm:text-4xl">{title}</h1>
      <p className="max-w-md text-base-content/70">{description}</p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Link to="/" className="btn btn-primary">
          Voltar para a página inicial
        </Link>
        <Link to="/noticias" className="btn btn-ghost">
          Ver notícias
        </Link>
      </div>
    </div>
  );
}
