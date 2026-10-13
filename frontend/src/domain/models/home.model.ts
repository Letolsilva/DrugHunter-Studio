// domain/models/home.model.ts

export interface HomeAmbienteModel {
  drug_hunter: boolean;
  python: boolean;
  smtp: boolean;
}

export interface HomeAtividadeItem {
  query?: string | null;
  target?: string | null;
  status?: string | null;
  data: string | null;
  total?: number | null;
}

export interface HomeAtividadeModel {
  ultima_busca_pdb: HomeAtividadeItem;
  ultimo_chembl: HomeAtividadeItem | null;
  ultimo_redocking: HomeAtividadeItem;
}

export interface HomeStatusModel {
  ambiente: HomeAmbienteModel;
  atividade: HomeAtividadeModel;
}
