// domain/models/search.model.ts

export interface PdbResultModel {
  pdb_id: string;
  proteina_buscada: string;
  titulo?: string;
  organismo?: string;
  classificacao?: string;
  resolucao: number | null;
  metodo?: string;
  tem_ligante: boolean;
  depositado_em?: string;
  link_pdb?: string;
  pdb_file_cached?: boolean;
}

export type SearchEventType =
  | "cache_hit"
  | "lista_proteinas"
  | "inicio_proteina"
  | "ids_encontrados"
  | "progresso"
  | "resultado"
  | "fim"
  | "erro_proteina"
  | "erro";

export interface SearchEventModel {
  tipo: SearchEventType;
  dado?: PdbResultModel;
  proteinas?: string[];
  total?: number;
  total_ids?: number;
  atual?: number;
  pdb_id?: string;
  proteina?: string;
  mensagem?: string;
}
