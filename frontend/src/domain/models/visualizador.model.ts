// domain/models/visualizador.model.ts

/** Uma folha da árvore: identificação única de um resíduo dentro de um PDB */
export interface ResidueLeaf {
  chain: string;
  resnum: string;
  n_atomos: number;
}

/** Nó intermediário: resName com suas folhas */
export interface ResidueGroup {
  resname: string;
  folhas: ResidueLeaf[];
}

/** Árvore completa de um arquivo PDB */
export interface PdbArvore {
  pdb_id: string;
  titulo: string | null;
  organismo: string | null;
  resolucao: number | null;
  metodo: string | null;
  arvore: {
    ATOM: Record<string, ResidueLeaf[]>;
    HETATM: Record<string, ResidueLeaf[]>;
  };
}

/** Item selecionado e acumulado para o CSV */
export interface SelecionadoItem {
  pdb_id: string;
  ligand: string; // resname
  resnum: string;
  chain: string;
  resolucao: number | null;
  formato: "legacy" | "cif";
}

/** Chave única de uma folha selecionada */
export function leafKey(
  pdb_id: string,
  tipo: string,
  resname: string,
  chain: string,
  resnum: string,
): string {
  return `${pdb_id}|${tipo}|${resname}|${chain}|${resnum}`;
}
