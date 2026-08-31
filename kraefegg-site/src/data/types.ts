export interface Project {
  id: string;
  title: string;
  sector: string;
  location: string;
  year: number;
  status: 'concluído' | 'em andamento' | 'planejamento' | 'ativo';
  client?: string;
  scope: string;
  description: string;
  technologies: string[];
  results: string[];
  images: string[];
  coordinates?: { lat: number; lng: number };
  category: string;
  featured: boolean;
}

export interface Platform {
  id: string;
  name: string;
  category: string;
  description: string;
  problem: string;
  solution: string;
  architecture: string[];
  technologies: string[];
  applications: string[];
  status: 'ativo' | 'desenvolvimento' | 'conceito' | 'em andamento';
  images: string[];
  demoUrl?: string;
  featured: boolean;
}

export interface Service {
  id: string;
  name: string;
  category: string;
  description: string;
  capabilities: string[];
  applications: string[];
  technologies: string[];
  icon?: string;
}

export interface Capability {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  items: string[];
  icon: string;
  color: string;
}
