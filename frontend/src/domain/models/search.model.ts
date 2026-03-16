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
  num_cadeias: number | null;
  ramachandran?: number;
  depositado_em?: string;
  qualidade: "Excelente" | "Boa" | "Razoável" | "Verificar";
  link_pdb?: string;
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
