export interface Case {
  id: string;
  title: string;
  sector: string;
  location: string;
  year: string;
  summary: string;
  highlights: string[];
  image: string;
  category: 'ambiental' | 'maritimo' | 'energia' | 'mineracao' | 'tecnologia';
}

const baseImages = '/images';

export const cases: Case[] = [
  {
    id: 'prad-caraubas',
    title: 'PRAD Caraúbas — Restauração da Caatinga',
    sector: 'Engenharia Ambiental',
    location: 'Caraúbas, Paraíba, Brasil',
    year: '2024',
    summary:
      'Plano de Recuperação de Áreas Degradadas com monitoramento contínuo via sensoriamento remoto (Sentinel-2), NDVI e inteligência geoespacial para restauração ecológica da Caatinga.',
    highlights: ['Monitoramento NDVI em tempo real', 'Timelapse Sentinel-2 da regeneração', 'Dashboard ambiental integrado'],
    image: `${baseImages}/prad/prad-1.jpg`,
    category: 'ambiental',
  },
  {
    id: 'smartportos-brasil',
    title: 'SmartPortos Brasil',
    sector: 'Marítimo & Portos',
    location: 'Brasil',
    year: '2024',
    summary:
      'Plataforma digital de inteligência marítima e portuária integrando GIS, dados de navios, monitoramento ambiental e dashboards operacionais com conformidade IMO.',
    highlights: ['Inteligência portuária integrada', 'Maritime Single Window', 'Dados navio-porto e ambientais'],
    image: `${baseImages}/portos/portos-1.jpg`,
    category: 'maritimo',
  },
  {
    id: 'auditoria-mineraria',
    title: 'Auditoria Ambiental — Operação Minerária',
    sector: 'Mineração',
    location: 'Brasil',
    year: '2023',
    summary:
      'Auditoria ambiental completa em operação minerária com avaliação de passivos ambientais, conformidade regulatória e plano de gerenciamento de impactos.',
    highlights: ['Avaliação de passivos ambientais', 'Conformidade regulatória completa', 'Plano de gerenciamento'],
    image: `${baseImages}/mineracao/mineracao-1.jpg`,
    category: 'mineracao',
  },
  {
    id: 'energia-solar-eolica',
    title: 'Viabilidade — Energia Solar & Eólica',
    sector: 'Energia Renovável',
    location: 'Nordeste, Brasil',
    year: '2023',
    summary:
      'Estudos completos de viabilidade técnica, econômica e ambiental para projetos de geração fotovoltaica e eólica, incluindo análise de irradiância e modelagem energética.',
    highlights: ['Análise de irradiância e vento', 'Avaliação técnico-econômica', 'Projetos estruturados para investimento'],
    image: `${baseImages}/energia/energia-1.jpg`,
    category: 'energia',
  },
  {
    id: 'inventario-florestal',
    title: 'Inventário Florestal & Monitoramento',
    sector: 'Engenharia Ambiental',
    location: 'Brasil',
    year: '2024',
    summary:
      'Inventário florestal e monitoramento de vegetação com sensoriamento remoto e campo, apoiando licenciamento e gestão ambiental de áreas naturais.',
    highlights: ['Inventário florestal detalhado', 'Análise de cobertura vegetal', 'Dados campo + satélite'],
    image: `${baseImages}/florestal/florestal-1.jpg`,
    category: 'ambiental',
  },
  {
    id: 'aio-observatory',
    title: 'AIO Observatory — Inteligência Climática',
    sector: 'Tecnologia & IA',
    location: 'Brasil',
    year: '2024',
    summary:
      'Plataforma web de observatório geoambiental integrando APIs meteorológicas, sensores, séries espectrais e inteligência artificial para apoio à decisão ambiental.',
    highlights: ['Observatório geoambiental web', 'Séries espectrais (NDVI/NDWI)', 'Integração de fontes de dados remotas'],
    image: `${baseImages}/tecnologia/tecnologia-1.png`,
    category: 'tecnologia',
  },
  {
    id: 'monitoramento-rio-do-peixe',
    title: 'Monitoramento Ambiental — Bacia Hidrográfica',
    sector: 'Engenharia Ambiental',
    location: 'Paraíba, Brasil',
    year: '2024',
    summary:
      'Programa de monitoramento da qualidade das águas e condições ambientais em bacia hidrográfica, com série temporal de dados e conformidade ambiental.',
    highlights: ['Série temporal de qualidade da água', 'Rede de sensores expandida', 'Relatórios de conformidade'],
    image: `${baseImages}/monitoramento/monitoramento-1.png`,
    category: 'ambiental',
  },
  {
    id: 'edge-iot-remoto',
    title: 'Monitoramento Remoto — Edge IoT',
    sector: 'Sistemas Embarcados & IoT',
    location: 'Brasil',
    year: '2024',
    summary:
      'Desenvolvimento de plataforma de monitoramento remoto com computação de borda (Edge AI), sensores ambientais e transmissão via rede celular para áreas remotas.',
    highlights: ['Edge IoT e ESP32', 'Alimentação solar autônoma', 'Telemetria e cloud'],
    image: `${baseImages}/sistemas/sistemas-1.jpeg`,
    category: 'tecnologia',
  },
];
