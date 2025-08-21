export type Profile = {
  id: string;
  updated_at: string;
  username: string;
  full_name: string;
  avatar_url: string;
  role: 'admin' | 'vendedor' | 'designer' | 'producao' | 'user';
  allowed_regions?: ('SE' | 'NE')[]; // Adicione esta linha
};
