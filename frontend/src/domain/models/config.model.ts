// domain/models/config.model.ts

export interface ConfigItemModel {
  chave: string;
  valor: string;
  descricao: string;
}

export interface ConfigsModel {
  configs: ConfigItemModel[];
}

export interface UsuarioItemModel {
  id: number;
  email: string;
  username: string;
  is_admin: boolean;
  created_at: string;
}

export interface UsuariosModel {
  usuarios: UsuarioItemModel[];
}
